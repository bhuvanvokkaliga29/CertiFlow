import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Loader2, Building, Mail, Lock, User } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name,
        email,
        password,
        organization_name: organizationName,
      });
      navigate('/dashboard');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Registration failed. Email may already be taken.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = detail.msg || JSON.stringify(detail);
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#17191C] flex flex-col justify-center items-center px-4 py-16 font-sans selection:bg-[#FBE1D1] selection:text-[#5D2A1A] animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#17191C] text-white rounded-full flex items-center justify-center font-serif text-sm">
              C
            </div>
            <span className="font-serif text-xl text-[#17191C] tracking-tight">CertiFlow</span>
          </Link>
          <h1 className="text-3xl font-serif font-normal text-[#17191C] tracking-tight mt-2">
            Create organization workspace
          </h1>
          <p className="text-sm text-[#777B86] font-sans">
            Set up your organization for bulk credential generation.
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white border border-[#ECECEC] p-8 rounded-[24px] shadow-[0_0_0_1px_rgba(4,23,43,0.05),0_20px_25px_-5px_rgba(0,0,0,0.08)]">
          {error && (
            <div className="mb-6 p-4 bg-[#FBE1D1] text-[#5D2A1A] text-xs rounded-[16px] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#5D2A1A]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#17191C] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A3A6AF]" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Elena Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#17191C] mb-1.5">
                Organization / University Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A3A6AF]" />
                <input
                  type="text"
                  required
                  placeholder="Acme Innovation Lab"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#17191C] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A3A6AF]" />
                <input
                  type="email"
                  required
                  placeholder="elena@acme.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#17191C] mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A3A6AF]" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-5 bg-[#17191C] hover:bg-black text-white text-xs font-medium rounded-full shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-[#777B86]">
          Already registered?{' '}
          <Link to="/login" className="text-[#17191C] font-medium hover:underline">
            Sign in to console →
          </Link>
        </div>
      </div>
    </div>
  );
};
