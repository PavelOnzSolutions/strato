import {Flex, Text} from '@radix-ui/themes';
import {useNavigate} from 'react-router-dom';
import {AlertTriangle} from 'lucide-react';
import StarBorder from '../../ux-feats/StarBorder';
import FuzzyText from '../../ux-feats/FuzzyText';

const Error404 = () => {
    const navigate = useNavigate();

    return (
        <Flex direction="column" align="center" justify="center" className="h-full min-h-[60vh] gap-6">
            <AlertTriangle size={72} className="text-[var(--orange-9)]" />
            <Flex direction="column" align="center" gap="2">
                <FuzzyText baseIntensity={0.2} hoverIntensity={0.7} enableHover={true} fontSize={72} fontWeight={900} fontFamily="inherit" color="gray">
                    404
                </FuzzyText>
                <Text size="5" className="text-[var(--gray-11)]">Page Not Found</Text>
                <Text size="3" className="text-[var(--gray-10)]">The page you are looking for does not exist or has been moved.</Text>
            </Flex>
            <StarBorder as="button" className="cursor-pointer" color="var(--accent-11)" speed="3s" thickness={2} onClick={() => navigate('/')}>
                <span className="font-semibold">Go to Dashboard</span>
            </StarBorder>
        </Flex>
    );
};

export default Error404;
