/**Group 8
 * Lars Maronde (764420)
 * Mariam Lang (764532)
 * Patrik Keppeler (765058)
 * Mohammed Kalash (765256)
 * */
const socket = io(window.location.href)

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const userList = document.getElementById('userList')

const translationServiceURL = "https://eu-gb.functions.cloud.ibm.com/api/v1/web/Lars.Maronde%40Student.reutlingen-university.de_dev/hrt-demo/identify-and-translate";

//object that stores all the lists of the open files in the chats
//globalFiles[id] to get the list where the id is the id of the chat/group
//globalFiles['global-chat-file-upload'] to get the global chat files list
let globalFiles = {}

showUsernamePrompt()

socket.on('connected', data => {
    refreshUserList(data)
})

socket.on('chat-message', async data => {
    let msg = await appendMessage(data.name, data.message.message, messageContainer, true)
    let files = []
    for (let url of data.message.fileList) {
        await fetch(url.data)
            .then(res => res.blob())
            .then(blob => {
                let dataType = url.data.substring(5).split(';')[0]
                const file = new File([blob], url.name, { type: dataType })
                files.push(file)
            })
    }
    let fileList = getFilesAsHtmlElements(files);
    if (fileList.length > 0) {
        msg.append(document.createElement('br'))
        for (let i = 0; i < fileList.length; i++) {
            msg.append(fileList[i])
            msg.append(document.createElement('br'))
        }
    }
})

socket.on('private-chat-message', async data => {
    let msg;
    
    if(!data.message.message && data.message.fileList.length <= 0) {
        //if msg is empty with no files do nothing
        return;
    }else {
        openPrivateChat(data.senderId, data.name)
        msg = await appendMessage(data.name, data.message.message, document.getElementById(data.senderId.toString() + "-chat").childNodes[1], true)
    }

    let files = []
    for (let url of data.message.fileList) {
        await fetch(url.data)
            .then(res => res.blob())
            .then(blob => {
                let dataType = url.data.substring(5).split(';')[0]
                const file = new File([blob], url.name, { type: dataType })
                files.push(file)
            })
    }
    let fileList = getFilesAsHtmlElements(files);
    if (fileList.length > 0) {
        msg.append(document.createElement('br'))
        for (let i = 0; i < fileList.length; i++) {
            msg.append(fileList[i])
            msg.append(document.createElement('br'))
        }
    }
})

socket.on('user-connected', info => {
    appendStaticMessage(info.username + ' connected', messageContainer)
    refreshUserList(info.userlist)
})

socket.on('user-disconnected', user => {
    if (user.username != null) {
        appendStaticMessage(user.username + ' disconnected', messageContainer)
        refreshUserList(user.userlist)
    }
})

messageForm.addEventListener('submit', async e => {
    e.preventDefault();
    let filesList2 = globalFiles['global-chat-file-upload']
    const message = messageInput.value
    let fileListElements = getFilesAsHtmlElements(filesList2)
    let fileListB64 = await getBase64FilesList(filesList2)

    let msg = null
    if (message.length > 0) {
        msg = await appendMessage('You', message, messageContainer, false)
    }
    //if only a file is submitted, the message stays empty
    else if (message.length == 0 && filesList2.length > 0) {
        msg = await appendMessage('You', '', messageContainer, false)
    }
    messageInput.value = ''

    //send the message to server with the files as an B64 encoded list
    socket.emit('send-chat-message', { message: message, fileList: fileListB64 })
    if(filesList2){
        if (filesList2.length > 0) {
            //reset the input fields
            messageInput.value = ''
            globalFiles['global-chat-file-upload'] = []
            document.getElementById('global-chat-file-upload').value = ''
            //reset attachment list
            let fileNamesContainer = document.getElementById('files')
            fileNamesContainer.innerHTML = ''
    
            //display the files in the chat
            msg.append(document.createElement('br'))
            for (let i = 0; i < fileListElements.length; i++) {
                msg.append(fileListElements[i])
                msg.append(document.createElement('br'))
            }
        }
    }
})

//returns a promise of a file that is converted into Base64 encoding
function getBase64(file, onLoadCallback) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

//returns a list of all Base64 encoded input files from the file upload
async function getBase64FilesList(fileInput) {
    let files = []
    // let fileInput = document.getElementById(elementId).files
    if(fileInput) {
        let promises = []
        for (let file of fileInput) {
            let promise = getBase64(file)
            promise.then(function (result) {
                files.push({ name: file.name, data: result })
            });
            promises.push(promise)
        }
        await Promise.all(promises)
    }
    return files;
}

//returns a list of the submited files in suited html formatted containers for
//image, video, audio and files
function getFilesAsHtmlElements(files) {
    let fileList = []
    let fileInput = files
    //if there are no files
    if(!fileInput) {
        return fileList;
    }
    for (let file of fileInput) {
        if (file.type.startsWith('image/')) {
            const img = document.createElement("img")
            img.style.maxHeight = '500px'
            img.style.maxWidth = '500px'
            img.classList.add('obj')
            img.file = file
            fileList.push(img)

            const reader = new FileReader();
            reader.onload = (function (aImg) { return function (e) { aImg.src = e.target.result; }; })(img);
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const vid = document.createElement('video')
            vid.style.maxHeight = '500px'
            vid.style.maxWidth = '500px'
            vid.controls = true

            let promise = getBase64(file)
            promise.then(function (result) {
                vid.src = result;
            });
            fileList.push(vid)
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio')
            audio.controls = true
            let promise = getBase64(file)
            promise.then(function (result) {
                audio.src = result;
            });
            fileList.push(audio)
        } else {
            const fileContainer = document.createElement('div')
            const link = document.createElement('a')
            link.download = file.name
            let promise = getBase64(file)
            promise.then(function (result) {
                link.href = result;
            });

            link.text = file.name
            fileContainer.append(link)
            fileList.push(fileContainer)
        }
    }
    return fileList;
}

/**
 * add the file names from the files input field to the file names container under the buttons 
 * @param {any} filesInputId
 * @param {any} containerId
 */
function getFileName(filesInputId, containerId) {
    let files = document.getElementById(filesInputId).files
    
    let filesList = []
    if(filesInputId == 'global-chat-file-upload'){
        globalFiles['global-chat-file-upload'] = filesList
    }else {
        globalFiles[filesInputId] = filesList
    }
    let fileNamesContainer = document.getElementById(containerId)
    fileNamesContainer.innerHTML = ''

    for (let i = 0; i < files.length; i++) {
        files[i].id = i;
        filesList.push(files[i])
        
        let wrapper = document.createElement('div')
        wrapper.classList.add('attachment')

        let fileName = document.createElement('p')
        let bt = document.createElement('button')
        bt.classList.add('delete_bt')
        bt.innerText = String.fromCharCode(10006)
        bt.innerText.ali

        fileName.innerHTML = files[i].name

        wrapper.append(fileName)
        wrapper.append(bt)

        fileNamesContainer.append(wrapper)

        //event for deleting a file
        bt.onclick = (event) => {
            event.preventDefault()
            wrapper.remove()
            filesList.splice(getIndexOfFile(filesList, i), 1)
        }
    }
};

/**
 * searches the filesList for an element with the specified id and returns the index where it is in the array
 * @param {*} files 
 * @param {*} id 
 */
function getIndexOfFile(files, id) {
    for(let i = 0; i < files.length; i++) {
        if(files[i].id == id) {
            return i;
        }
    }
}

/**the prompt window from the browser to log in the chat with the user name */
function showUsernamePrompt() {
    // let name = prompt('What is your name?')
    // while (!name) {
    //     name = prompt('What is your name?')
    // }
    let name = window.location.search.substr(1).split("=")[1]
    appendStaticMessage(name + ', you joined', messageContainer)
    socket.emit('new-user', name)
}

/**
 * create the header for the messages in the message containers with the name of the sender and the timestamp 
 * @param {any} username
 */
function createMessageHeader(username, translate) {
    let header = document.createElement('h2')

    let name = document.createElement('span')
    name.style.fontSize = '14pt'
    name.style.marginRight = '.5rem'
    name.innerHTML = username
    header.append(name)

    var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    let timestamp = document.createElement('span')
    timestamp.style.fontSize = '9pt'
    timestamp.classList.add('lightgrey')
    timestamp.innerHTML = time
    header.append(timestamp)

    if(translate) {
        let translateButton = document.createElement('span')
        translateButton.id = 'translationButton'
        translateButton.style.fontSize = '8pt'
        translateButton.style.marginRight = '.5rem'
        translateButton.style.float="right"
        translateButton.style.cursor = 'pointer'
        translateButton.innerHTML = '(übersetzen)'
        header.append(translateButton)
    }
    
    return header
}

async function translateText(language, text) {
    var url = new URL(translationServiceURL),
    params = {text:text, targetTranslationLanguage:language}
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    let answer;
    try{
        answer = JSON.parse(await (await fetch(url)).text());
    }catch (error){
        return false
    }
    if(answer.translations) {
        return answer.translations.result.translations[0].translation;
    }
    //error when translating
    return false;
}
/**
 * add the text with the user name in the container
 * @param {String} username
 * @param {String} text
 * @param {any} container
 */
async function appendMessage(username, text, container, translate) {
    let header;
    let translatedText;
    if(translate) { //enable this so sender doesnt get the translation
        let locale = navigator.language || navigator.userLanguage; 
        let translation = await translateText(locale, text);
        if(translation) {
            header = createMessageHeader(username, true);
            translatedText = translation;
        }else {
            header = createMessageHeader(username, false);
        }
    }else {
        header = createMessageHeader(username, false);
    }

    let message = document.createElement('div');
    message.classList.add('message');

    let content = document.createElement('span');
    content.classList.add('original');
    content.innerHTML = text;

    message.append(header);
    message.append(content);
    
    if(translatedText && translate){
        let translationButton = header.children[2];

        translationButton.onclick = () => {
            if(content.classList.contains('original')){
                content.classList.remove('original');
                content.innerHTML = translatedText;
                content.classList.add('translated');
                translationButton.classList.add('translationEnabled');
            }else {
                content.classList.remove('translated');
                content.innerHTML = text;
                content.classList.add('original'); 
                translationButton.classList.remove('translationEnabled');
            }
        };
    }

    container.append(message);
    return message
}

/**
 * add and highlight the message in the container
 * @param {String} message
 * @param {any} container
 */
function appendStaticMessage(message, container) {
    const messageElement = document.createElement('div')
    messageElement.style.backgroundColor = "#353e75"
    messageElement.classList.add('message')
    var time = new Date().toLocaleTimeString();
    messageElement.innerText = time + ": " + message
    container.append(messageElement)
}

/**
 * clear the list and assign the names of all users in the chat room to the user list again to be up to date
 * @param {any} users
 */
function refreshUserList(users) {
    userList.innerHTML = ''; //clear the list
    for (let id in users) {
        let listElement = document.createElement('li')
        listElement.innerText = users[id]
        listElement.id = id
        listElement.classList.add('list-item')
        userList.appendChild(listElement)

        listElement.ondblclick = () => {
            if (socket.id != id) {
                openPrivateChat(id, users[id])
            }

        }
    }
}

function openPrivateChat(id, userName) {
    /**make the window for the private chatroom*/
    var privateChat = document.getElementById(id.toString() + "-chat")

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
        privateChat.id = id.toString() + "-chat"
        document.body.appendChild(privateChat)

        /**make the header for the private chatroom window*/
        const privateChatHeader = document.createElement('div')
        privateChatHeader.id = id.toString() + '-chat-header'
        privateChatHeader.style.cursor = 'grab'
        privateChatHeader.style.display = 'block ruby'

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
        privatMessagesContainer.classList.add('chatWindow')

        /**the send container with the Buttons in the private chat window */
        const privateSendContainer = document.createElement('form')
        privateSendContainer.classList.add('chatForm')

        /**the input fielt for entering a text */
        const inputField = document.createElement('input')
        inputField.setAttribute('type', 'text')
        inputField.placeholder = "Nachricht..."
        inputField.classList.add('chatWindowInputField')

        /**the bitton for sending files and text */
        const privateSendButton = document.createElement('button')
        privateSendButton.innerHTML = "Send"
        privateSendButton.type = "submit"

        /**the button for calling the file input to be able to upload files */
        const privateUploadButton = document.createElement('button')
        privateUploadButton.id = "private-upload-button"
        privateUploadButton.onclick = () => {
            document.getElementById(id.toString() + '-private-upload-input').click(); return false;
        }

        /**the file input
         * this is only clicked on the button, so it is invisible
         * the id is created using the user id because this schould be unique */
        const privateUploadInput = document.createElement('input')
        privateUploadInput.type = "file"
        privateUploadInput.multiple = "true"
        privateUploadInput.id = id.toString() + "-private-upload-input"
        privateUploadInput.style.display = "none"
        privateUploadInput.onchange = () => {
            getFileName(id.toString() + '-private-upload-input', id.toString() + '-privateFiles')
        }

        /**the div for the files before sending that are still to be uploaded */
        const privateFiles = document.createElement('div')
        privateFiles.id = id.toString() + "-privateFiles"
        privateFiles.style.marginTop = '9px'
        privateFiles.style.position = 'absolute'
        privateFiles.style.display = "block ruby"

        /**send the text and the files in the send container to the message
         * send the files or text using the server to the partner in the chat*/
        privateSendContainer.addEventListener('submit', async e => {
            e.preventDefault();
            const message = inputField.value
            let fileList = getFilesAsHtmlElements(globalFiles[id.toString() + '-private-upload-input'])
            let fileListB64 = await getBase64FilesList(globalFiles[id.toString() + '-private-upload-input'])

            let msg = null
            if (message.length > 0) {
                msg = await appendMessage('You', message, privatMessagesContainer, false)
            }
            else if (message.length == 0 && fileList.length > 0) {
                msg = await appendMessage('You', '', privatMessagesContainer, false)
            }
            inputField.value = ''

            socket.emit('send-private-chat-message', id, { message: message, fileList: fileListB64 })

            if (fileList.length > 0) {
                inputField.value = ''
                privateUploadInput.value = ''

                delete globalFiles[id.toString() + '-private-upload-input']

                let fileNamesContainer = privateFiles
                fileNamesContainer.innerHTML = ''

                msg.append(document.createElement('br'))
                for (let i = 0; i < fileList.length; i++) {
                    msg.append(fileList[i])
                    msg.append(document.createElement('br'))
                }
            }
        })

        /**assign the buttons and input fields to the send container */
        privateSendContainer.appendChild(inputField)
        privateSendContainer.appendChild(privateSendButton)
        privateSendContainer.appendChild(privateUploadButton)
        privateSendContainer.appendChild(privateUploadInput)
        privateSendContainer.appendChild(privateFiles)

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
    let header = document.getElementById(elmnt.id + "-header")
    if (header) {
        /* if present, the header is where you move the DIV from:*/
        header.onmousedown = dragMouseDown;
    } else {
        /* otherwise, move the DIV from anywhere inside the DIV:*/
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        header.style.cursor = 'grabbing'
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

        if (elmnt.style.top.startsWith('-')) elmnt.style.top = "0px"
        if (elmnt.style.left.startsWith('-')) elmnt.style.left = "0px"
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        header.style.cursor = 'grab'
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
    for (let i = 0; i < userListNodes.length; i++) {
        let node = userListNodes[i].cloneNode(true)
        if (node.id == socket.id) {
            continue;
        }
        node.onclick = () => {
            if (node.style.backgroundColor != 'green') {
                node.style.backgroundColor = 'green'
                groupParticipants[node.id] = node.innerHTML
            } else {
                node.style.backgroundColor = ''
                delete groupParticipants[node.id]
            }
        }
        groupUserList.append(node)
    }
}

function closeCreateGroupWindow() {
    document.getElementById('createGroupModal').style.display = 'none'
}

function abortCreateGroup() {
    closeCreateGroupWindow()
    //clear the array
    groupParticipants = {}
}

//stores all the current groups of the user (id/name)
groups = {}
function createGroup() {
    if (Object.keys(groupParticipants).length <= 0) {
        alert("Du musst zuerst Teilnehmer auswählen")

    } else if
        (document.getElementById('groupName').value == '') {
        alert("Du musst einene Gruppennamen angeben")
    } else {
        var groupname = document.getElementById('groupName').value
        closeCreateGroupWindow()
        let id = 'id' + (new Date()).getTime(); //todo check if not used already
        addGroupToList(id, groupname)

        document.getElementById('groupName').value = ''

        socket.emit('create-group', id, groupname, groupParticipants)
        openGroupChatWindow(id)

        appendStaticMessage('You created the group', document.getElementById(id.toString() + '-chat').childNodes[1])

        //reset
        groupParticipants = {}
    }
}

function addGroupToList(id, groupname) {
    let groupList = document.getElementById('groupList')
    let name = groupname

    //get all ids
    let participants = Object.keys(groupParticipants)

    //get the names of the id and add them to the name
    // TODO IN THE MODAL TO CREATE GROUP THE NAME SHOULD BE ENTERED 
    // AND MEMBERS SHOULD BE IN AN EXTRA LIST 
    /**for(let i = 0; i < participants.length;i++) {
        if(i < participants.length-1) {
            name += groupParticipants[participants[i]] + ", "
        }else {
            name += groupParticipants[participants[i]]
        }
    }
*/
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
    windowId = id + '-chat'
    let chat = document.getElementById(windowId)
    if (chat) {
        //showing
        chat.style.display = 'block'
    } else {
        const chatWindow = document.createElement('div')
        chatWindow.id = windowId
        chatWindow.classList.add('drop-shadow')
        chatWindow.classList.add('chat-window')
        document.body.appendChild(chatWindow)

        /**make the header for the group chatroom window*/
        const groupChatHeader = document.createElement('div')
        groupChatHeader.id = id.toString() + '-chat-header'
        groupChatHeader.style.cursor = 'grab'
        groupChatHeader.style.display = 'inline-block'
        groupChatHeader.style.width = '100%'

        const title = document.createElement('h2')
        title.innerHTML = groups[id]

        const closeButton = document.createElement('h2')
        closeButton.classList.add('close-button')
        const closeButtonText = document.createTextNode(String.fromCharCode(10006))
        closeButton.appendChild(closeButtonText)
        closeButton.onclick = () => {
            chatWindow.style.display = 'none'
        }

        /**the button to leave the group chat 
         * delete user from the group
         * delete the groupList element after leaving
         */
        const leavebutton = document.createElement('button')
        leavebutton.classList.add('leave-button')
        leavebutton.title = "Leave the group"
        leavebutton.onclick = () => {
            chatWindow.style.display = 'none'
            socket.emit('leave-group', id)
            document.getElementById('groupList').removeChild(document.getElementById('groupList').children[id])
        }

        //the message container
        const messagesContainer = document.createElement('div')
        messagesContainer.classList.add('chatWindow')

        //the input field with the buttons
        const inptContainer = document.createElement('form')
        inptContainer.classList.add('chatForm')

        const inputField = document.createElement('input')
        inputField.setAttribute('type', 'text')
        inputField.placeholder = "Nachricht..."
        inputField.classList.add('chatWindowInputField')

        const sendButton = document.createElement('button')
        sendButton.innerHTML = "Send"
        sendButton.type = "submit"

        const groupUploadButton = document.createElement('button')
        groupUploadButton.id = "group-upload-button"
        groupUploadButton.onclick = () => {
            document.getElementById(id.toString() + '-group-upload-input').click(); return false;
        }
        const groupUploadInput = document.createElement('input')
        groupUploadInput.type = "file"
        groupUploadInput.multiple = "true"
        groupUploadInput.id = id.toString() + "-group-upload-input"
        groupUploadInput.style.display = "none"
        groupUploadInput.onchange = () => {
            getFileName(id.toString() + '-group-upload-input', id.toString() + '-groupFiles')
        }

        const groupFiles = document.createElement('div')
        groupFiles.style.marginTop = '9px'
        groupFiles.style.position = 'absolute'
        groupFiles.style.display = "block ruby"
        groupFiles.id = id.toString() + "-groupFiles"

        inptContainer.addEventListener('submit', async e => {
            e.preventDefault();
            const message = inputField.value
            let fileList = getFilesAsHtmlElements(globalFiles[id.toString() + '-group-upload-input'])
            let fileListB64 = await getBase64FilesList(globalFiles[id.toString() + '-group-upload-input'])

            let msg = null
            if (message.length > 0) {
                msg = await appendMessage('You', message, messagesContainer, false)
            }
            else if (message.length == 0 && fileList.length > 0) {
                msg = await appendMessage('You', '', messagesContainer, false)
            }

            inputField.value = ''

            socket.emit('send-group-message', id, { message: message, fileList: fileListB64 })

            if (fileList.length > 0) {
                inputField.value = ''
                groupUploadInput.value = ''
                delete globalFiles[id.toString() + '-group-upload-input']

                let fileNamesContainer = groupFiles
                fileNamesContainer.innerHTML = ''

                msg.append(document.createElement('br'))
                for (let i = 0; i < fileList.length; i++) {
                    msg.append(fileList[i])
                    msg.append(document.createElement('br'))
                }
            }
        })

        inptContainer.appendChild(inputField)
        inptContainer.appendChild(sendButton)
        inptContainer.appendChild(groupUploadButton)
        inptContainer.appendChild(groupUploadInput)
        inptContainer.appendChild(groupFiles)


        /**add the tiltle and the button as h2 to the header of the window*/
        groupChatHeader.appendChild(title)
        groupChatHeader.appendChild(closeButton)
        groupChatHeader.appendChild(leavebutton)
        chatWindow.append(groupChatHeader)
        chatWindow.append(messagesContainer)
        chatWindow.append(inptContainer)

        dragElement(chatWindow)
    }
}

function deleteGroupChat(id) {
    delete groups[id]
    document.getElementById(id).remove()
    document.getElementById(id + '-chat').remove()
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

    appendStaticMessage('Welcome to the group, ' + data.users[socket.id], document.getElementById(data.id.toString() + '-chat').childNodes[1])

    socket.emit('join-group', data.id)
})

socket.on('group-chat-message', async data => {
    openGroupChatWindow(data.groupId)
    //appendMessage(data.name, data.message, document.getElementById(data.groupId.toString() + "-chat").childNodes[1])

    if(!data.message.message && data.message.fileList.length <= 0) {
        //if msg is empty with no files do nothing
        return;
    }else {
        msg = await appendMessage(data.name, data.message.message, document.getElementById(data.groupId.toString() + "-chat").childNodes[1], false)
    }

    let files = []
    for (let url of data.message.fileList) {
        await fetch(url.data)
            .then(res => res.blob())
            .then(blob => {
                let dataType = url.data.substring(5).split(';')[0]
                const file = new File([blob], url.name, { type: dataType })
                files.push(file)
            })
    }
    let fileList = getFilesAsHtmlElements(files);
    if (fileList.length > 0) {
        msg.append(document.createElement('br'))
        for (let i = 0; i < fileList.length; i++) {
            msg.append(fileList[i])
            msg.append(document.createElement('br'))
        }
    }
 })

socket.on('user-left-group', data => {
    appendStaticMessage(data.name + ' has left the group', document.getElementById(data.groupId.toString() + '-chat').childNodes[1])
})