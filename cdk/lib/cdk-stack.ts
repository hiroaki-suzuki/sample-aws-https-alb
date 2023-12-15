import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Network } from './constracts/network'
import { AppRole } from './constracts/app-role'
import { FrontEcs } from './constracts/front-ecs'
import { AppSecurityGroup } from './constracts/app-security-group'
import { LoadBalancer } from './constracts/load-balancer'

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const network = new Network(this, 'network')

    const appRole = new AppRole(this, 'role')

    const appSecurityGroup = new AppSecurityGroup(this, 'security-group', {
      vpc: network.vpc,
    })

    const frontEcs = new FrontEcs(this, 'front-ecs', {
      vpc: network.vpc,
      taskExecutionRole: appRole.ecsTaskExecutionRole,
      frontEcsTaskRole: appRole.frontEcsTaskRole,
      frontEcsSecurityGroup: appSecurityGroup.frontEcsSecurityGroup,
    })

    const loadBalancer = new LoadBalancer(this, 'load-balancer', {
      vpc: network.vpc,
      albSecurityGroup: appSecurityGroup.albSecurityGroup,
      frontEcsService: frontEcs.service,
    })
  }
}
