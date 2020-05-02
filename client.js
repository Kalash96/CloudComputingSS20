const socket = io('http://localhost:3000')

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const userList = document.getElementById('userList')

showUsernamePrompt()

socket.on('connected', data => {
    refreshUserList(data)
})

socket.on('chat-message', data => {
    appendMessage(data.name, data.message)
})

socket.on('private-chat-message', data => {
    //TODO opens the chat window and displays the message
})

socket.on('user-connected', info => {
    appendStaticMessage(info.username + ' connected')
    refreshUserList(info.userlist)
})

socket.on('user-disconnected', user => {
    if(user.username != null) {
        appendStaticMessage(user.username + ' disconnected')
        refreshUserList(user.userlist)
    }
})

messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const message = messageInput.value
    if(message.length > 0) {
        appendMessage('You', message)
        socket.emit('send-chat-message', message)
        messageInput.value = ''
    }
})

function showUsernamePrompt() {
    const name = prompt('What is your name?')
    appendStaticMessage(name + ', you joined')

    socket.emit('new-user', name)
}

function createMessageHeader(username) {
    let header = document.createElement('h2')

    let name = document.createElement('span')
    name.style.fontSize = '14pt'
    name.style.marginRight = '.5rem'
    name.innerHTML = username
    header.append(name)

    var time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    let timestamp = document.createElement('span')
    timestamp.style.fontSize = '9pt'
    timestamp.classList.add('lightgrey')
    timestamp.innerHTML = time

    header.append(timestamp)
    return header
}

function appendMessage(username, text) {
    let header = createMessageHeader(username)

    let message = document.createElement('div')
    message.classList.add('message')

    let content = document.createElement('span')
    content.innerHTML = text
    
    message.append(header)
    message.append(content)

    messageContainer.append(message)
}

function appendStaticMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.style.backgroundColor = "#353e75"
    messageElement.classList.add('message')
    var time = new Date().toLocaleTimeString();
    messageElement.innerText = time + ": " + message
    messageContainer.append(messageElement)
}

function refreshUserList(users) {
    userList.innerHTML = ''; //clear the list
    for(let id in users) {
        let listElement = document.createElement('li')    
        listElement.innerText = users[id]
        userList.appendChild(listElement)
        
        listElement.ondblclick = () => {

            openPrivateChat(id, users[id])
        }
    }
}

function openPrivateChat(id, userName) {
    //TODO
    /**make the window for the private chatroom*/
    const privateChat = document.createElement('div')
    privateChat.classList.add('private-chat-window')
    privateChat.id = "private-chats-areas"
    document.body.appendChild(privateChat)

    /**make the header for the private chatroom window*/
    const privateChatHeader = document.createElement('div')
    privateChatHeader.classList.add('private-chats-areasheader')

    /**the name of the private chatroom window should be the name from the user in the list (in the header) */
    const privateChatTitle = document.createElement('h2')
    privateChatTitle.id = "private-chat-tiltle"
    const userNameText = document.createTextNode(userName)
    privateChatTitle.appendChild(userNameText)

    /**the close button for the window of the chatroom */
    const closeButton = document.createElement('h2')
    closeButton.id = "closeChatWindow"
    const closeButtonText = document.createTextNode("Close")
    closeButton.appendChild(closeButtonText)

    /**add the tiltle and the button as h2 to the header of the window*/
    privateChatHeader.appendChild(privateChatTitle)
    privateChatHeader.appendChild(closeButton)

    /**add the header to the window*/
    privateChat.append(privateChatHeader)

    /**define the function of the close button. the window of the private room should be closed with the button  */
    closeButton.onclick = () => {
        privateChat.style.display = 'none'
    }

    /**make the private room window draggable*/
    dragElement(privateChat) 
    socket.emit('send-private-chat-message', id, 'example message')
}


//make a element with a header movable (e.g. div)
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
        /* if present, the header is where you move the DIV from:*/
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
        /* otherwise, move the DIV from anywhere inside the DIV:*/
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
    }
}