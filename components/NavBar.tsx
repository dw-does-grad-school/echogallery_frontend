'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";

const Navbar: React.FC = () => {
    const { isLoaded, user } = useUser();
    const { signOut } = useClerk();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Clerk user image helpers differ by version; try common properties and fall back
    const userImage =
        (user as any)?.profileImageUrl || (user as any)?.imageUrl || "/favicon.ico";

    return (
        <nav className="relative bg-gray-800">
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div className="relative flex h-16 items-center justify-between">
                    <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileOpen((s) => !s)}
                            aria-controls="mobile-menu"
                            aria-expanded={mobileOpen}
                            className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:outline-offset-1 focus:outline-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {mobileOpen ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                    className="h-6 w-6"
                                >
                                    <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                    className="h-6 w-6"
                                >
                                    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                        <div className="flex shrink-0 items-center">
                            <Link href="/" className="inline-flex">
                                <Image
                                    src="/logo.svg"
                                    alt="Your Company"
                                    width={32}
                                    height={32}
                                    className="h-8 w-auto"
                                />
                            </Link>
                        </div>

                        <div className="hidden sm:ml-6 sm:block">
                            <div className="flex space-x-4">
                                <Link href="#" className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
                                    Dashboard
                                </Link>
                                <Link href="#" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                                    Team
                                </Link>
                                <Link href="#" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                                    Projects
                                </Link>
                                <Link href="#" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                                    Calendar
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                        <button
                            type="button"
                            className="relative rounded-full p-1 text-gray-400 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
                        >
                            <span className="sr-only">View notifications</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" className="h-6 w-6">
                                <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        <div className="relative ml-3">
                            {isLoaded && user ? (
                                <>
                                    <button
                                        onClick={() => setProfileOpen((s) => !s)}
                                        className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                        aria-haspopup="true"
                                        aria-expanded={profileOpen}
                                    >
                                        <span className="sr-only">Open user menu</span>
                                        <Image
                                            src={userImage}
                                            alt={user?.fullName || "User avatar"}
                                            width={32}
                                            height={32}
                                            className="rounded-full bg-gray-800"
                                            unoptimized={userImage.startsWith('http')}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                                            <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Your profile</Link>
                                            <Link href="/profile/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
                                            <button
                                                onClick={() => {
                                                    signOut();
                                                    setProfileOpen(false);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <SignInButton mode="modal">
                                    <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500">
                                        Sign in
                                    </button>
                                </SignInButton>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {mobileOpen && (
                <div id="mobile-menu" className="block sm:hidden">
                    <div className="space-y-1 px-2 pt-2 pb-3">
                        <Link href="#" className="block rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white">Dashboard</Link>
                        <Link href="#" className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white/5 hover:text-white">Team</Link>
                        <Link href="#" className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white/5 hover:text-white">Projects</Link>
                        <Link href="#" className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white/5 hover:text-white">Calendar</Link>
                    </div>
                </div>
            )}
        </nav>
    );
};
export default Navbar;