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
            openPrivateChat(id)
        }
    }
}

function openPrivateChat(id) {
    //TODO
    socket.emit('send-private-chat-message', id, 'example message')
}
