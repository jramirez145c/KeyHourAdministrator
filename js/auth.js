class Auth {
    static async authenticate(email, password) {

        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        return data;
    }
}

window.Auth = Auth;
