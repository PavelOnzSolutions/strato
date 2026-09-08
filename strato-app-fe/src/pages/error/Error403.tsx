import {Flex, Text} from '@radix-ui/themes';
import {useNavigate} from 'react-router-dom';
import {ShieldAlert} from 'lucide-react';
import StarBorder from '../../ux-feats/StarBorder';
import FuzzyText from '../../ux-feats/FuzzyText';

const Error403 = () => {
    const navigate = useNavigate();

    return (
        <Flex direction="column" align="center" justify="center" className="h-full min-h-[60vh] gap-6">
            <ShieldAlert size={72} className="text-[var(--crimson-9)]" />
            <Flex direction="column" align="center" gap="2">
                <FuzzyText baseIntensity={0.2} hoverIntensity={0.5} enableHover={true} fontSize={72} fontWeight={900} fontFamily="inherit" color="gray">
                    403
                </FuzzyText>
                <Text size="5" className="text-[var(--gray-11)]">Access Denied</Text>
                <Text size="3" className="text-[var(--gray-10)]">You do not have permission to view this page.</Text>
            </Flex>
            <StarBorder as="button" className="cursor-pointer" color="var(--accent-11)" speed="3s" thickness={2} onClick={() => navigate("/")}>
                <span className="font-semibold">Go Home</span>
            </StarBorder>
        </Flex>
    );
};

export default Error403;