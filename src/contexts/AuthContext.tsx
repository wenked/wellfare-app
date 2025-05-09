import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
	user: User | null;
	session: Session | null;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	signup: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const getSession = async () => {
			console.log('[AuthContext] Checking initial session...');
			const {
				data: { session: currentSession },
				error,
			} = await supabase.auth.getSession();
			if (error) {
				console.error('[AuthContext] Error getting initial session:', error);
				setIsLoading(false);
				return;
			}
			console.log('[AuthContext] Initial session:', currentSession);
			setSession(currentSession);
			setUser(currentSession?.user ?? null);
			setIsLoading(false);
		};

		getSession();

		const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
			console.log(
				'[AuthContext] onAuthStateChange triggered. Event:',
				_event,
				'Session:',
				currentSession
			);
			setSession(currentSession);
			setUser(currentSession?.user ?? null);
			console.log('[AuthContext] User set to:', currentSession?.user ?? null);
		});

		return () => {
			authListener?.subscription.unsubscribe();
		};
	}, []);

	const login = async (email: string, password: string) => {
		console.log('[AuthContext] Attempting login for:', email);
		setIsLoading(true);
		try {
			const { data, error } = await supabase.auth.signInWithPassword({ email, password });
			console.log('[AuthContext] Supabase login response - Data:', data, 'Error:', error);
			if (error) throw error;
		} finally {
			setIsLoading(false);
			console.log('[AuthContext] Login attempt finished, isLoading set to false.');
		}
	};

	const signup = async (email: string, password: string) => {
		console.log('[AuthContext] Attempting signup for:', email);
		setIsLoading(true);
		try {
			const { data, error } = await supabase.auth.signUp({ email, password });
			console.log('[AuthContext] Supabase signup response - Data:', data, 'Error:', error);
			if (error) throw error;
		} finally {
			setIsLoading(false);
			console.log('[AuthContext] Signup attempt finished, isLoading set to false.');
		}
	};

	const logout = async () => {
		setIsLoading(true);
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider value={{ user, session, isLoading, login, signup, logout }}>
			{(() => {
				console.log(
					'[AuthContext] Provider rendering. isLoading:',
					isLoading,
					'User:',
					user ? user.id : null
				);
				return null;
			})()}
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
