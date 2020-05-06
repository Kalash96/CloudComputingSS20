const socket = io('http://localhost:3000')

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const userList = document.getElementById('userList')

showUsernamePrompt()

socket.on('connected', data => {
    refreshUserList(data)
})

socket.on('chat-message', async data => {
    let msg = appendMessage(data.name, data.message.message, messageContainer)
    let files = []
    for(let url of data.message.fileList){
        await fetch(url.data)
        .then(res => res.blob())
        .then(blob => {
            let dataType = url.data.substring(5).split(';')[0]
            const file = new File([blob], url.name, { type: dataType})
            files.push(file)
        })
    }
    let fileList = getFilesAsHtmlElements(files);
    if(fileList.length > 0) {
        msg.append(document.createElement('br'))
        for(let i = 0; i < fileList.length; i++) {
            msg.append(fileList[i])
            msg.append(document.createElement('br'))
        }
    }
})

socket.on('private-chat-message', data => {
    // TODO opens the chat window and displays the message
    // zeige das chatfenster
    // im chatfenster kann man dann nachrichten senden  -> send-private-chat-message
    // bei Schließung des fensters wird das fenster mit display: none versteckt
    // falls das fenster schon exisiert wird es nicth neu erstellt sondern mit display: block wieder sichtbar gemacht
    openPrivateChat(data.senderId, data.name)
    appendMessage(data.name, data.message, document.getElementById(data.senderId.toString() + "-private-chats-areas").childNodes[1])


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

messageForm.addEventListener('submit', async e => {
    e.preventDefault();
    const message = messageInput.value
    let fileList = getFilesAsHtmlElements(document.getElementById('file-upload').files)
    let fileListB64 = await getBase64FilesList()

    let msg = null
    if(message.length > 0) {
        msg = appendMessage('You', message, messageContainer)
    }
    //if only a file is submitted, the message stays empty
    else if(message.length == 0 && fileList.length > 0) {
        msg = appendMessage('You', '', messageContainer)
    }
    messageInput.value = ''

    //send the message to server with the files as an B64 encoded list
    socket.emit('send-chat-message', {message: message, fileList: fileListB64})

    if(fileList.length > 0) {
        //reset the input fields
        messageInput.value = ''
        document.getElementById('file-upload').value = ''
        //reset attachment list
        let fileNamesContainer = document.getElementById('files')
        fileNamesContainer.innerHTML = ''
        
        //display the files in the chat
        msg.append(document.createElement('br'))
        for(let i = 0; i < fileList.length; i++) {
            msg.append(fileList[i])
            msg.append(document.createElement('br'))
        }
    }
})

//returns a promise of a file that is converted into Base64 encoding
 function getBase64(file, onLoadCallback) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

//returns a list of all Base64 encoded input files from the file upload
async function getBase64FilesList() {
    let files = []
    let fileInput = document.getElementById('file-upload').files
    let promises = []
    for(let file of fileInput) {
        let promise = getBase64(file)
        promise.then(function(result) {
            files.push({name: file.name, data: result})
        });
        promises.push(promise)
    }
    await Promise.all(promises)
    return files;
 }

//returns a list of the submited files in suited html formatted containers for
//image, video, audio and files
function getFilesAsHtmlElements(files) {
    let fileList = []
    let fileInput = files
    for(let file of fileInput) {
        if (file.type.startsWith('image/')){ 
            const img = document.createElement("img")
            img.style.maxHeight = '500px'
            img.style.maxWidth = '500px'
            img.classList.add('obj')
            img.file = file
            fileList.push(img)
    
            const reader = new FileReader();
            reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(img);
            reader.readAsDataURL(file);
        }else if(file.type.startsWith('video/')) {
            const vid = document.createElement('video')
            vid.style.maxHeight = '500px'
            vid.style.maxWidth = '500px'
            vid.controls = true
            
            let promise = getBase64(file)
            promise.then(function(result) {
                vid.src = result;
            });
            fileList.push(vid)
        }else if(file.type.startsWith('audio/')) {
            const audio = document.createElement('audio')
            audio.controls = true
            let promise = getBase64(file)
            promise.then(function(result) {
                audio.src = result;
            });
            fileList.push(audio)
        }else {
            const fileContainer = document.createElement('div')
            const link = document.createElement('a')
            link.download = file.name
            let promise = getBase64(file)
            promise.then(function(result) {
                link.href = result;
            });
           
            link.text = file.name
            fileContainer.append(link)
            fileList.push(fileContainer)
        }
    }
    return fileList;
}

function getFileName () {
    let files = document.getElementById('file-upload').files
    let fileNamesContainer = document.getElementById('files')
    fileNamesContainer.innerHTML = ''

    for(let i = 0; i < files.length; i++) {
        let fileName = document.createElement('p')
        fileName.classList.add('attachment')
        fileName.innerHTML = files[i].name
        fileNamesContainer.append(fileName)
    }
};

function showUsernamePrompt() {
    let name = prompt('What is your name?')
    while(!name) {
        console.log("inv")
        name = prompt('What is your name?')
    }
    console.log(name)
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


function appendMessage(username, text, container) {
    let header = createMessageHeader(username)

    let message = document.createElement('div')
    message.classList.add('message')

    let content = document.createElement('span')
    content.innerHTML = text
    
    message.append(header)
    message.append(content)

    container.append(message)
    return message
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
        listElement.id = id
        listElement.classList.add('list-item')
        userList.appendChild(listElement)
        
        listElement.ondblclick = () => {
            openPrivateChat(id, users[id])
        }
    }
}

function openPrivateChat(id, userName) {
    //TODO
    /**make the window for the private chatroom*/
    var privateChat = document.getElementById(id.toString() + "-private-chats-areas")

    /**when the window was opened, then make the none window to block window */
    if (privateChat) {
        if (privateChat.style.display == "none") {
            privateChat.style.display = "block"
        }
    }

    /**for new private chatroom windows*/
    else {
        const privateChat = document.createElement('div')
        privateChat.classList.add('drop-shadow')
        privateChat.classList.add('chat-window')
        privateChat.id = id.toString() + "-private-chats-areas"
        document.body.appendChild(privateChat)

        /**make the header for the private chatroom window*/
        const privateChatHeader = document.createElement('div')
        privateChatHeader.id = id.toString() + '-private-chats-areasheader'

        /**the name of the private chatroom window should be the name from the user in the list (in the header) */
        const privateChatTitle = document.createElement('h2')
        privateChatTitle.id = "private-chat-tiltle"
        const userNameText = document.createTextNode(userName)
        privateChatTitle.appendChild(userNameText)

        /**the close button for the window of the chatroom */
        const closeButton = document.createElement('h2')
        closeButton.classList.add('close-button')
        const closeButtonText = document.createTextNode(String.fromCharCode(10006))
        closeButton.appendChild(closeButtonText)

        /**the message container in the private chat window */
        const privatMessagesContainer = document.createElement('div')
        privatMessagesContainer.id = "privatChatDiv"

        /**the input field with the Buttons in the private chat window */
        const privateSendContainer = document.createElement('form')
        privateSendContainer.id = 'privateChatForm'

        const inputField = document.createElement('input')
        inputField.setAttribute('type', 'text')
        inputField.placeholder = "Nachricht..."
        inputField.id = "privateInputField"

        const privateSendButton = document.createElement('button')
        privateSendButton.innerHTML = "Send"
        privateSendButton.type = "submit"



        privateSendContainer.addEventListener('submit', async e => {
            e.preventDefault();
            const message = inputField.value

            let msg = null
            if (message.length > 0) {
                msg = appendMessage('You', message, privatMessagesContainer)
            }
            inputField.value = ''

            socket.emit('send-private-chat-message', id, message)


        })

        privateSendContainer.appendChild(inputField)
        privateSendContainer.appendChild(privateSendButton)

        /**add the tiltle and the button as h2 to the header of the window*/
        privateChatHeader.appendChild(privateChatTitle)
        privateChatHeader.appendChild(closeButton)

        /**add the header to the window*/
        privateChat.append(privateChatHeader)

        /**define the function of the close button. the window of the private room should be closed with the button  */
        closeButton.onclick = () => {
            privateChat.style.display = 'none'
        }

        /**add the private message container for the private chatroom window*/
        privateChat.append(privatMessagesContainer)

        privateChat.append(privateSendContainer)

        /**make the private room window draggable*/
        dragElement(privateChat)
        //socket.emit('send-private-chat-message', id, 'example message')
    }
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

        if(elmnt.style.top.startsWith('-')) elmnt.style.top = "0px"
        if(elmnt.style.left.startsWith('-')) elmnt.style.left = "0px"
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
    }

}

groupParticipants = {}
function showCreateGroupWindow() {
    const modal = document.getElementById('createGroupModal')
    modal.style.display = 'block'
    let groupUserList = document.getElementById('newGroupChatUserList')
    groupUserList.innerHTML = ''
    
    let userListNodes = userList.childNodes
    for(let i = 0; i < userListNodes.length; i++) {
        let node = userListNodes[i].cloneNode(true)
        node.onclick = () => {
            if(node.style.backgroundColor != 'green'){
                node.style.backgroundColor = 'green'
                groupParticipants[node.id] = node.innerHTML
            }else {
                node.style.backgroundColor = ''
                delete groupParticipants[node.id]
            }
            console.log(groupParticipants)
        }
        groupUserList.append(node)

    }

}

function closeCreateGroupWindow() {
    document.getElementById('createGroupModal').style.display = 'none'
}

function abortCreateGroup () {
    closeCreateGroupWindow()
    //clear the array
    groupParticipants = {}
}

//stores all the current groups of the user (id/name)
groups = {}
function createGroup() {
    if(Object.keys(groupParticipants).length <= 0) {
        alert("Du musst zuerst Teilnehmer auswählen")
    }else {
        closeCreateGroupWindow()
        let id  = 'id' + (new Date()).getTime(); //todo check if not used already
        addGroupToList(id)

        socket.emit('create-group', id, groups[id], groupParticipants)
        openGroupChatWindow(id)
        //reset
        groupParticipants = {}
    }
}

function addGroupToList(id) {
    let groupList = document.getElementById('groupList')
    let name = ''

    //get all ids
    let participants = Object.keys(groupParticipants)

    //get the names of the id and add them to the name
    // TODO IN THE MODAL TO CREATE GROUP THE NAME SHOULD BE ENTERED 
    // AND MEMBERS SHOULD BE IN AN EXTRA LIST 
    for(let i = 0; i < participants.length;i++) {
        if(i < participants.length-1) {
            name += groupParticipants[participants[i]] + ", "
        }else {
            name += groupParticipants[participants[i]]
        }
    }

    let listItem = document.createElement('li')
    listItem.id = id
    listItem.classList.add('list-item')
    listItem.innerHTML = name

    //store the id and name for later reference
    groups[id] = name
    listItem.ondblclick = () => openGroupChatWindow(id)
    groupList.append(listItem)
}


function openGroupChatWindow(id) {
    windowId = id+'-chat'
    let chat = document.getElementById(windowId)
    if(chat) {
        //showing
        chat.style.display = 'block'
    } else {
        const chatWindow = document.createElement('div')
        chatWindow.id = windowId
        chatWindow.classList.add('drop-shadow')
        chatWindow.classList.add('chat-window')
        document.body.appendChild(chatWindow)

        const title = document.createElement('h2')
        title.innerHTML = groups[id]

        const closeButton = document.createElement('h2')
        closeButton.classList.add('close-button')
        const closeButtonText = document.createTextNode(String.fromCharCode(10006))
        closeButton.appendChild(closeButtonText)
        closeButton.onclick = () => {
            chatWindow.style.display = 'none'
        }
        
        input = document.createElement('input')
        input.type = 'text'
        input.placeholder = 'Nachricht'

        chatWindow.append(title)
        chatWindow.append(closeButton)
        chatWindow.append(input)

        dragElement(chatWindow)
    }
}

function deleteGroupChat(id) {
    delete groups[id]
    document.getElementById(id).remove()
    document.getElementById(id+'-chat').remove()
}

//group id and name
socket.on('new-group', data => {
    groups[data.id] = data.name
    openGroupChatWindow(data.id)

    let groupList = document.getElementById('groupList')

    let listItem = document.createElement('li')
    listItem.id = data.id
    listItem.classList.add('list-item')
    listItem.innerHTML = data.name

    listItem.ondblclick = () => openGroupChatWindow(data.id)
    groupList.append(listItem)

    socket.emit('join-group', data.id)
})

socket.on('group-chat-message', data => {
    console.log(data)
})