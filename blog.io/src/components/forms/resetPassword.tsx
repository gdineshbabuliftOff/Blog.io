"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import AuthLayout from './AuthLayout';

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [verificationState, setVerificationState] = useState<'verifying' | 'valid' | 'invalid'>('verifying');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setVerificationState('invalid');
        setError('Invalid or missing password reset code.');
        return;
      }
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setVerificationState('valid');
      } catch (err) {
        setVerificationState('invalid');
        setError('The password reset link is invalid or has expired. Please request a new one.');
      }
    };
    verifyCode();
  }, [oobCode]);

  const initialValues = {
    newPassword: '',
    confirmPassword: ''
  };

  const validationSchema = Yup.object({
    newPassword: Yup.string()
      .required('New password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Passwords must match')
      .required('Please confirm your new password'),
  });

  const handleResetPassword = async (values: typeof initialValues, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    setError('');
    if (!oobCode) return;

    try {
      await confirmPasswordReset(auth, oobCode, values.newPassword);
      setSuccess(true);
    } catch (err) {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (verificationState === 'verifying') {
      return <p className="text-center text-gray-300">Verifying link...</p>;
    }

    if (verificationState === 'invalid') {
      return (
        <div className="text-center">
          <p className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm mb-4">{error}</p>
          <Link href="/forgot-password" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Request a new reset link
          </Link>
        </div>
      );
    }

    if (success) {
      return (
        <div className="text-center">
          <p className="bg-green-900/50 text-green-300 p-3 rounded-md text-sm mb-4">
            Your password has been reset successfully!
          </p>
          <Link href="/login" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Proceed to Log In
          </Link>
        </div>
      );
    }

    return (
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleResetPassword}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">{error}</p>}
            <div>
              <label htmlFor="newPassword">New Password</label>
              <Field name="newPassword" type="password" className="auth-input" />
              <ErrorMessage name="newPassword" component="p" className="auth-error" />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <Field name="confirmPassword" type="password" className="auth-input" />
              <ErrorMessage name="confirmPassword" component="p" className="auth-error" />
            </div>
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex justify-center py-3 px-4 rounded-md font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </motion.button>
          </Form>
        )}
      </Formik>
    );
  };

  return (
    <AuthLayout title="Set a New Password">
      {renderContent()}
    </AuthLayout>
  );
};

const ResetPasswordPage = () => (
  <Suspense fallback={<div className="min-h-screen bg-gray-900 flex justify-center items-center text-white">Loading...</div>}>
    <ResetPasswordForm />
  </Suspense>
);

export default ResetPasswordPage;