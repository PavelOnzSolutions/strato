export interface IDeploymentVersionMatrix {
    id?: string;
    environmentId: string;
    componentName: string;
    version: string;
    deployedAt: string;
    commitId?: string;
    executor?: string;
    author?: string;
}
