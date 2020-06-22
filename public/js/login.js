


async function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    let url = "/login"+"?username="+username+"&password="+password;
    let response = await fetch(url, {method:"GET"});
    console.log(response.status);
    if(response.status === 200) {
        //solve differently
        window.location.href = "/chat?username="+username;
    }else{
        alert(await response.text())
    }
}

async function signup() {
    // Not working
    // await fetch("/signup", {method:"GET"});
    window.location.href="/signup"
}