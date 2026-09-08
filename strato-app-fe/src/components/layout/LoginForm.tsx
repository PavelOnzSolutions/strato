import React, { useState } from 'react';
import { Button, TextField, Text, Card, Flex, Box, Callout } from '@radix-ui/themes';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';


const LoginForm = () => {
    const { login, loginWithMicrosoft } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleMicrosoftLogin = () => {
        loginWithMicrosoft();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ username, password });
            navigate('/');
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card size="4" className="w-full shadow-lg">
            <form onSubmit={handleSubmit}>
                <Flex direction="column" gap="4">
                    {error && (
                        <Callout.Root color="red">
                            <Callout.Icon>
                                <AlertCircle size={16} />
                            </Callout.Icon>
                            <Callout.Text>
                                {error}
                            </Callout.Text>
                        </Callout.Root>
                    )}

                    <Box>
                        <Text as="label" size="2" weight="bold" className="mb-1 block text-[var(--gray-12)]">
                            User Name
                        </Text>
                        <TextField.Root
                            placeholder="Enter your user name"
                            size="3"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        >
                            <TextField.Slot>
                                <User size={16} />
                            </TextField.Slot>
                        </TextField.Root>
                    </Box>

                    <Box>
                        <Text as="label" size="2" weight="bold" className="mb-1 block text-[var(--gray-12)]">
                            Password
                        </Text>
                        <TextField.Root
                            type="password"
                            placeholder="Enter your password"
                            size="3"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        >
                            <TextField.Slot>
                                <Lock size={16} />
                            </TextField.Slot>
                        </TextField.Root>
                    </Box>

                    <Button size="3" variant="solid" className="w-full cursor-pointer" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    <div className="relative my-2">

                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-2 text-(--gray-11)">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        size="3"
                        variant="outline"
                        color="gray"
                        className="w-full cursor-pointer"
                        onClick={handleMicrosoftLogin}
                        type="button"
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="microsoft" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                            <path fill="currentColor" d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"></path>
                        </svg>
                        Sign in with Microsoft
                    </Button>
                </Flex>
            </form>
        </Card>

    );
};

export default LoginForm;
