import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Mail, Lock, User, Building, Eye, EyeOff, Workflow } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardContent } from '../../components/ui';

export function RegisterPage() {
    const { register, isAuthenticated, isLoading: authLoading } = useAuth();
    const [formData, setFormData] = useState({
        accountName: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    if (authLoading) {
        return null;
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await register(formData);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-surface-950 to-accent-900/20"></div>

            {/* Glow effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"></div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                        <Workflow className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">FlowForge</h1>
                </div>

                <Card variant="glass">
                    <CardContent className="pt-6">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-surface-100">Create your account</h2>
                            <p className="text-surface-400 mt-1">Start your workflow automation journey</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Organization Name"
                                type="text"
                                placeholder="Enter your company name"
                                value={formData.accountName}
                                onChange={(e) => updateField('accountName', e.target.value)}
                                leftIcon={<Building className="h-4 w-4" />}
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="First Name"
                                    type="text"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => updateField('firstName', e.target.value)}
                                    leftIcon={<User className="h-4 w-4" />}
                                    required
                                />
                                <Input
                                    label="Last Name"
                                    type="text"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => updateField('lastName', e.target.value)}
                                    required
                                />
                            </div>

                            <Input
                                label="Email"
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                leftIcon={<Mail className="h-4 w-4" />}
                                required
                            />

                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={(e) => updateField('password', e.target.value)}
                                leftIcon={<Lock className="h-4 w-4" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                }
                                hint="Must be at least 8 characters"
                                required
                            />

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            <label className="flex items-start gap-2 text-sm text-surface-400">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/50"
                                    required
                                />
                                <span>
                                    I agree to the{' '}
                                    <a href="#" className="text-primary-400 hover:text-primary-300">
                                        Terms of Service
                                    </a>{' '}
                                    and{' '}
                                    <a href="#" className="text-primary-400 hover:text-primary-300">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>

                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Create account
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-surface-400">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
