import { mount } from "svelte";
import App from "./Root.svelte";

const app = mount(App, {
    target: document.getElementById("root"),
    props: {
        url: window.location.pathname,
    },
});

export default app;
