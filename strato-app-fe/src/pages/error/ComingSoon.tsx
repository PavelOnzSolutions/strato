import {Flex, Text} from '@radix-ui/themes';
import {Hammer} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import StarBorder from '../../ux-feats/StarBorder';
import FuzzyText from '../../ux-feats/FuzzyText';

const ComingSoon = () => {
  const navigate = useNavigate();

  return (
    <Flex direction="column" align="center" justify="center" className="h-full min-h-[60vh] gap-6">
      <Hammer size={72} className="text-[var(--accent-9)]" />
      <Flex direction="column" align="center" gap="2">
        <FuzzyText
          baseIntensity={0.2}
          hoverIntensity={0.7}
          enableHover={true}
          fontSize={56}
          fontWeight={900}
          fontFamily="inherit"
          color="gray"
        >
          Coming Soon
        </FuzzyText>
        <Text size="5" className="text-[var(--gray-11)]">This feature is under construction.</Text>
        <Text size="3" className="text-[var(--gray-10)]">Just wait and chill...</Text>
      </Flex>
      <StarBorder as="button" className="cursor-pointer" color="var(--accent-11)" speed="3s" thickness={2} onClick={() => navigate('/')}> 
        <span className="font-semibold">Go to Dashboard</span>
      </StarBorder>
    </Flex>
  );
};

export default ComingSoon;
