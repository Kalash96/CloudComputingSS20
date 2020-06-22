

async function signup() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let passwordConfirm = document.getElementById("passwordConfirm").value;

    if(password != passwordConfirm){
        alert("Password stimmt nicht überein");
        return;
    }else{
        let url = "/signup"+"?username="+username+"&password="+password;
        let response = await fetch(url, {method:"POST"});
        console.log(response.status);
        if(response.status === 200) {
            //solve differently with express render
            window.location.href = "/chat?username="+username;
        }else if(response.status === 400) {
            alert("Username already taken");
        }else{
            alert(await response.text())
        }
    }

}