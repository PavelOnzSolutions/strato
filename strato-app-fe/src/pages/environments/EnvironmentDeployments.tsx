import {Card, Progress} from "@radix-ui/themes";
import {usePageTitle} from "../../context/PageTitleContext";

const EnvironmentDeployments = () => {
    usePageTitle('Deployments');

    const isLoading = false;

    return (
        <Card size="4" className="w-full shadow-lg">
            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}

        </Card>
    )
}

export default EnvironmentDeployments