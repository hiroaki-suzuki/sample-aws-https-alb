import { Construct } from 'constructs'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { namePrefix } from '../utils'

export class AppRole extends Construct {
  public readonly ecsTaskExecutionRole: Role
  public readonly frontEcsTaskRole: Role

  constructor(scope: Construct, id: string) {
    super(scope, id)

    // ECSタスク実行用のロールを作成する
    const ecsTaskExecutionRole = this.createEcsTaskExecutionRole()
    // フロントECSタスク用のロールを作成する
    const frontEcsTaskRole = this.createFrontEcsTaskRole()

    this.ecsTaskExecutionRole = ecsTaskExecutionRole
    this.frontEcsTaskRole = frontEcsTaskRole
  }

  private createEcsTaskExecutionRole(): Role {
    const roleName = `${namePrefix}-ecs-task-execution-role`
    return new Role(this, roleName, {
      roleName: roleName,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
        },
      ],
    })
  }

  private createFrontEcsTaskRole(): Role {
    const roleName = `${namePrefix}-front-ecs-task-role`
    return new Role(this, roleName, {
      roleName: roleName,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    })
  }
}
