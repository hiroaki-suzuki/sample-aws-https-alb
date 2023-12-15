import { Construct } from 'constructs'
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { namePrefix } from '../utils'
import { Tags } from 'aws-cdk-lib'

interface AppSecurityGroupProps {
  vpc: Vpc
}

export class AppSecurityGroup extends Construct {
  public readonly albSecurityGroup: SecurityGroup
  public readonly frontEcsSecurityGroup: SecurityGroup

  constructor(scope: Construct, id: string, props: AppSecurityGroupProps) {
    super(scope, id)

    const { vpc } = props

    // ALB用セキュリティグループを作成する
    const albSecurityGroup = this.createAlbSecurityGroup(vpc)
    // フロント用ECS用セキュリティグループを作成する
    const frontEcsSecurityGroup = this.createFrontEcsSecurityGroup(vpc, albSecurityGroup)

    this.albSecurityGroup = albSecurityGroup
    this.frontEcsSecurityGroup = frontEcsSecurityGroup
  }

  private createAlbSecurityGroup(vpc: Vpc): SecurityGroup {
    const albSecurityGroup = this.createSecurityGroup('alb-sg', 'ALB security group', vpc)

    albSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'from ALB')

    return albSecurityGroup
  }

  private createFrontEcsSecurityGroup(vpc: Vpc, albSecurityGroup: SecurityGroup): SecurityGroup {
    const frontEcsSecurityGroup = this.createSecurityGroup(
      'front-ecs-sg',
      'Front ECS security group',
      vpc,
    )

    frontEcsSecurityGroup.addIngressRule(albSecurityGroup, Port.tcp(80), 'from ALB')

    return frontEcsSecurityGroup
  }

  private createSecurityGroup(name: string, description: string, vpc: Vpc): SecurityGroup {
    const securityGroupName = `${namePrefix}-${name}`
    const securityGroup = new SecurityGroup(this, securityGroupName, {
      securityGroupName: securityGroupName,
      description: description,
      vpc: vpc,
    })
    Tags.of(securityGroup).add('Name', securityGroupName)

    return securityGroup
  }
}
