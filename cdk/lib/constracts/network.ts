import { Construct } from 'constructs'
import { CfnRouteTable, IpAddresses, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Tags } from 'aws-cdk-lib'
import { namePrefix } from '../utils'

export class Network extends Construct {
  public readonly vpc: Vpc

  constructor(scope: Construct, id: string) {
    super(scope, id)

    const vpcName = `${namePrefix}-vpc`
    const vpc = new Vpc(this, vpcName, {
      vpcName: vpcName,
      ipAddresses: IpAddresses.cidr('172.16.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    })
    vpc.publicSubnets.forEach((subnet, index) => {
      const no = index + 1
      Tags.of(subnet).add('Name', `${namePrefix}-public-subnet-${no}`)

      const rtb = subnet.node.findChild('RouteTable') as CfnRouteTable
      Tags.of(rtb).add('Name', `${namePrefix}-public-rtb-${no}-rtb`)
    })

    this.vpc = vpc
  }
}
