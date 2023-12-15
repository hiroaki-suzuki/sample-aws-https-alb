import { Construct } from 'constructs'
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { namePrefix } from '../utils'
import { FargateService } from 'aws-cdk-lib/aws-ecs'
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'

interface LoadBalancerProps {
  vpc: Vpc
  albSecurityGroup: SecurityGroup
  frontEcsService: FargateService
}

export class LoadBalancer extends Construct {
  public readonly alb: ApplicationLoadBalancer

  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id)

    const { vpc, albSecurityGroup, frontEcsService } = props

    // ALBを作成する
    const alb = this.createApplicationLoadBalancer(vpc, albSecurityGroup)
    // ALBのログを保存するS3バケットを作成する
    this.createAlbLogBucket(alb)
    // フロント用ECSへ流すターゲットグループを追加する
    this.addFrontEcsTargetGroup(alb, frontEcsService)

    this.alb = alb
  }

  private createAlbLogBucket(alb: ApplicationLoadBalancer): Bucket {
    const bucketName = `${namePrefix}-alb-log`

    const bucket = new Bucket(this, bucketName, {
      bucketName: bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [
        {
          id: `${namePrefix}-delete-lifecycle-rule`,
          enabled: true,
          expiration: Duration.days(183),
        },
      ],
      autoDeleteObjects: true,
    })
    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [bucket.arnForObjects('*')],
        principals: [
          new ArnPrincipal('arn:aws:iam::582318560864:root'), // ALB自体のアカウント
        ],
      }),
    )
    alb.logAccessLogs(bucket)

    return bucket
  }

  private createApplicationLoadBalancer(
    vpc: Vpc,
    albSecurityGroup: SecurityGroup,
  ): ApplicationLoadBalancer {
    const loadBalancerName = `${namePrefix}-alb`

    return new ApplicationLoadBalancer(this, loadBalancerName, {
      loadBalancerName: loadBalancerName,
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    })
  }

  private addFrontEcsTargetGroup(alb: ApplicationLoadBalancer, frontEcsService: FargateService) {
    const frontListener = alb.addListener(`${namePrefix}-listener`, {
      port: 80,
    })

    const targetGroupName = `${namePrefix}-front-ecs-tg`
    frontListener.addTargets(targetGroupName, {
      targetGroupName: targetGroupName,
      port: 80,
      targets: [frontEcsService],
    })
  }
}
