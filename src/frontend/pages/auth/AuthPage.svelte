<!-- svelte-ignore event_directive_deprecated -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->

<script>
    import AnimatedText from "../../components/ui/animated-text.svelte";
    import Button from "../../components/ui/button.svelte";
    import Input from "../../components/ui/input.svelte";
    import { onMount } from "svelte";

    let selectedType = $state("login");
    let alert = $state({ type: "", message: "" });

    let loginForm = $state({
        username: "",
        password: "",
    });

    let signupForm = $state({
        name: "",
        semail: "",
        spassword: "",
        srepeatPassword: "",
    });

    function showAlert(type, message) {
        alert = { type, message };
        setTimeout(() => (alert = { type: "", message: "" }), 3000);
    }

    function handleLoginChange(e) {
        console.log(e);
        loginForm = {
            ...loginForm,
            [e.target.id]: e.target.value,
        };
    }

    function handleSignupChange(e) {
        signupForm = {
            ...signupForm,
            [e.target.id]: e.target.value,
        };
    }

    async function handleLogin(e) {
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
            loginForm = { username: "", password: "" };
            // navigate("/ui");
            window.location.href = "/ui";
        } catch (error) {
            showAlert("error", error.message);
        }
    }

    async function handleSignup(e) {
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
            signupForm = { name: "", semail: "", spassword: "", srepeatPassword: "" };
            // navigate("/ui");
            window.location.href = "/ui";
        } catch (error) {
            showAlert("error", error.message);
        }
    }

    onMount(() => {
        document.title = "Authentication";
    });
</script>

<div class="bg-black w-full min-h-screen text-gray-100">
    <main class="container mx-auto px-4 py-8 relative z-10">
        <div class="max-w-md mx-auto">
            <h1 class="text-3xl font-bold text-center mb-8 text-white tracking-tight">
                <AnimatedText text="Authentication"></AnimatedText>
            </h1>

            <div class="bg-black rounded-xl shadow-2xl p-6">
                <!-- Login Form -->

                <div
                    on:focus={() => (selectedType = "login")}
                    on:mouseenter={() => (selectedType = "login")}
                    class="mb-8 {selectedType === 'login' ? '' : 'opacity-30'}"
                >
                    <h2 class="text-xl font-semibold mb-6 text-gray-100">Login</h2>
                    <form on:submit={handleLogin} class="space-y-4 flex flex-col gap-4r">
                        <Input
                            title="Username"
                            id="username"
                            type="text"
                            value={loginForm.username}
                            oninput={handleLoginChange}
                            placeholder="Enter your username"
                            autocomplete="username"
                        />
                        <Input
                            title="Password"
                            id="password"
                            type="password"
                            value={loginForm.password}
                            oninput={handleLoginChange}
                            placeholder="Enter your password"
                            autocomplete="current-password"
                        />
                        <Button
                            type="submit"
                            class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-500 focus:outline-none focus:ring-2 
                focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800
                transition-all duration-200"
                        >
                            Login
                        </Button>
                    </form>
                </div>

                <!-- Divider -->
                <div class="relative my-6">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-slate-600"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-slate-800 text-gray-400">Or</span>
                    </div>
                </div>

                <!-- Sign Up Form -->
                <div
                    on:focus={() => (selectedType = "signup")}
                    on:mouseenter={() => (selectedType = "signup")}
                    class="mb-8 {selectedType === 'signup' ? '' : 'opacity-30'}"
                >
                    <h2 class="text-xl font-semibold mb-6 text-gray-100">SignUp</h2>
                    <form on:submit={handleSignup} class="space-y-4">
                        <Input
                            title="Username"
                            id="name"
                            type="text"
                            value={signupForm.name}
                            oninput={handleSignupChange}
                            placeholder="Enter your username"
                            autocomplete="username"
                        />
                        <Input
                            title="Email"
                            id="semail"
                            type="email"
                            value={signupForm.semail}
                            oninput={handleSignupChange}
                            placeholder="Enter your email"
                            autocomplete="email"
                        />
                        <Input
                            title="Password"
                            id="spassword"
                            type="password"
                            value={signupForm.spassword}
                            oninput={handleSignupChange}
                            placeholder="Enter your password"
                            autocomplete="new-password"
                        />
                        <Input
                            title="Repeat Password"
                            id="srepeatPassword"
                            type="password"
                            value={signupForm.srepeatPassword}
                            oninput={handleSignupChange}
                            placeholder="Repeat password"
                            autocomplete="new-password"
                        />
                        <Button
                            type="submit"
                            class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg
                hover:bg-purple-500 focus:outline-none focus:ring-2
                focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800
                transition-all duration-200"
                        >
                            Create Account
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    </main>

    {#if alert.message}
        <div
            class="z-10 fixed left-4 top-4 p-4 mb-4 rounded-lg border
          {alert.type === 'success' ? 'text-green-300 bg-green-900/50 border-green-700' : ''}
          {alert.type === 'error' ? 'text-red-300 bg-red-900/50 border-red-700' : ''}"
            on:click={() => (alert = { type: "", message: "" })}
        >
            {alert.message}
        </div>
    {/if}
</div>
