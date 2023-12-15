import { Construct } from 'constructs'
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  DeploymentControllerType,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  OperatingSystemFamily,
  Protocol,
} from 'aws-cdk-lib/aws-ecs'
import { namePrefix } from '../utils'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Role } from 'aws-cdk-lib/aws-iam'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'

interface FrontEcsProps {
  vpc: Vpc
  taskExecutionRole: Role
  frontEcsTaskRole: Role
  frontEcsSecurityGroup: SecurityGroup
}

export class FrontEcs extends Construct {
  public readonly service: FargateService

  constructor(scope: Construct, id: string, props: FrontEcsProps) {
    super(scope, id)

    const { vpc, taskExecutionRole, frontEcsTaskRole, frontEcsSecurityGroup } = props

    // ECSクラスターを作成する
    const cluster = this.createEcsCluster(vpc)
    // ECSタスク定義を作成する
    const taskDef = this.createTaskDefinition(taskExecutionRole, frontEcsTaskRole)
    // ECSタスク用のロググループを作成する
    const logGroup = this.createLogGroup(this)
    // ECSタスク定義にフロント用コンテナを追加する
    this.addContainer(taskDef, logGroup)
    // ECSサービスを作成する
    this.service = this.createEcsService(cluster, taskDef, frontEcsSecurityGroup)
  }

  private createEcsCluster(vpc: Vpc): Cluster {
    const clusterName = `${namePrefix}-front-cluster`
    return new Cluster(this, clusterName, {
      clusterName: clusterName,
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    })
  }

  private createTaskDefinition(
    taskExecutionRole: Role,
    frontEcsTaskRole: Role,
  ): FargateTaskDefinition {
    const family = `${namePrefix}-front-task`
    return new FargateTaskDefinition(this, family, {
      family: family,
      executionRole: taskExecutionRole,
      taskRole: frontEcsTaskRole,
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.X86_64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    })
  }

  private createLogGroup(scope: Construct): LogGroup {
    return new LogGroup(scope, `${namePrefix}-front-ecs-log-group`, {
      logGroupName: `/ecs/${namePrefix}-front-log`,
      retention: RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    })
  }

  private addContainer(taskDef: FargateTaskDefinition, logGroup: LogGroup) {
    const containerName = `${namePrefix}-front-ecs-container`
    taskDef.addContainer(containerName, {
      containerName: containerName,
      image: ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      portMappings: [
        {
          containerPort: 80,
          protocol: Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'],
        interval: Duration.seconds(10),
        timeout: Duration.seconds(10),
        retries: 3,
      },
      logging: LogDrivers.awsLogs({
        streamPrefix: 'ecs',
        logGroup: logGroup,
      }),
    })
  }

  private createEcsService(
    cluster: Cluster,
    taskDef: FargateTaskDefinition,
    frontEcsSecurityGroup: SecurityGroup,
  ): FargateService {
    const serviceName = `${namePrefix}-front-service`
    return new FargateService(this, serviceName, {
      serviceName: serviceName,
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: true,
      deploymentController: {
        type: DeploymentControllerType.ECS,
      },
      circuitBreaker: {
        rollback: true,
      },
      securityGroups: [frontEcsSecurityGroup],
    })
  }
}
