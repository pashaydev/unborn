import { useNavigate } from "react-router";
import React, { useEffect, useState } from "react";

const Input = ({ label, id, type = "text", value, onChange, placeholder, autoComplete }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            required
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                    text-gray-100 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                    transition-all duration-200"
            placeholder={placeholder}
        />
    </div>
);

const Alert = ({ type, message, onClose }) => {
    if (!message) return null;

    const styles = {
        success: "text-green-300 bg-green-900/50 border-green-700",
        error: "text-red-300 bg-red-900/50 border-red-700",
    };

    return (
        <div
            className={`z-10 fixed left-4 top-4 p-4 mb-4 rounded-lg border ${styles[type]}`}
            onClick={onClose}>
            {message}
        </div>
    );
};

export const AuthPage = () => {
    const navigate = useNavigate();
    const [alert, setAlert] = useState({ type: "", message: "" });

    const [loginForm, setLoginForm] = useState({
        username: "",
        password: "",
    });

    const [signupForm, setSignupForm] = useState({
        name: "",
        semail: "",
        spassword: "",
        srepeatPassword: "",
    });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: "", message: "" }), 3000);
    };

    const handleLoginChange = e => {
        setLoginForm(prev => ({
            ...prev,
            [e.target.id]: e.target.value,
        }));
    };

    const handleSignupChange = e => {
        setSignupForm(prev => ({
            ...prev,
            [e.target.id]: e.target.value,
        }));
    };

    const handleLogin = async e => {
        e.preventDefault();
        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginForm),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Login failed");

            localStorage.setItem("authToken", data.token);
            showAlert("success", "Successfully logged in!");
            setLoginForm({ username: "", password: "" });
            navigate("/ui");
        } catch (error) {
            showAlert("error", error.message);
        }
    };

    const handleSignup = async e => {
        e.preventDefault();

        if (signupForm.spassword !== signupForm.srepeatPassword) {
            showAlert("error", "Passwords do not match");
            return;
        }

        try {
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: signupForm.name,
                    email: signupForm.semail,
                    password: signupForm.spassword,
                    repeatPassword: signupForm.spassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Signup failed");

            localStorage.setItem("authToken", data.token);
            showAlert("success", "Account created successfully!");
            setSignupForm({ name: "", semail: "", spassword: "", srepeatPassword: "" });
            navigate("/ui");
        } catch (error) {
            showAlert("error", error.message);
        }
    };

    useEffect(() => {
        // set title
        document.title = "Authentication";
    }, []);

    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto">
                    <h1 className="text-3xl font-bold text-center mb-8 text-white tracking-tight">
                        Authentication
                    </h1>

                    <div className="bg-gray-900 rounded-xl shadow-2xl p-6 border border-slate-700">
                        {/* Login Form */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-6 text-gray-100">Login</h2>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <Input
                                    label="Username"
                                    id="username"
                                    type="text"
                                    value={loginForm.username}
                                    onChange={handleLoginChange}
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                />
                                <Input
                                    label="Password"
                                    id="password"
                                    type="password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="submit"
                                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg 
                                            hover:bg-blue-500 focus:outline-none focus:ring-2 
                                            focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800
                                            transition-all duration-200">
                                    Login
                                </button>
                            </form>
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-slate-800 text-gray-400">Or</span>
                            </div>
                        </div>

                        {/* Sign Up Form */}
                        {/* Similar structure for signup form using the Input component */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-6 text-gray-100">SignUp</h2>
                            <form onSubmit={handleSignup} className="space-y-4">
                                <Input
                                    label="Username"
                                    id="name"
                                    type="text"
                                    onChange={handleSignupChange}
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                />

                                <Input
                                    label="Email"
                                    id="semail"
                                    type="email"
                                    value={signupForm.semail}
                                    onChange={handleSignupChange}
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                />

                                <Input
                                    label="Password"
                                    id="spassword"
                                    type="password"
                                    value={signupForm.spassword}
                                    onChange={handleSignupChange}
                                    placeholder="Enter your password"
                                    autoComplete="password"
                                />
                                <Input
                                    label="Repeat Password"
                                    id="srepeatPassword"
                                    type="password"
                                    value={signupForm.srepeatPassword}
                                    onChange={handleSignupChange}
                                    placeholder="Repeat password"
                                />

                                <button
                                    type="submit"
                                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg
                                            hover:bg-purple-500 focus:outline-none focus:ring-2
                                            focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800
                                            transition-all duration-200">
                                    Create Account
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert({ type: "", message: "" })}
            />
        </>
    );
};
