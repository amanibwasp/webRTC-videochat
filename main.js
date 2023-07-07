let remoteStream;
let localStream;
let peerConnection

let APP_ID = 'f1b3329c247f4636823fcca2ae49ec39'

let client;
let channel;
let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let urlString = window.location.search
let urlStringParams = new URLSearchParams(urlString)
let conference_id = urlStringParams.get('conference')
if (!conference_id){
    window.location = 'lobby.html'
}


const servers = {
    iceServers: [
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let init = async () => {

    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel(conference_id)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleMemberLeft)
    client.on('MessageFromPeer', handleMessageFromUser)
    
    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    document.getElementById("video-1").srcObject = localStream;


};
let handleMemberLeft = () => {
    document.getElementById("video-2").style.display = "none"
}

let handleMessageFromUser = async(message, fromWhoId) => {
    message = JSON.parse(message.text)
    console.log("NEW MESSAGE!:", message)
    if (message.type === 'offer') {
        createAnswer(fromWhoId, message.offer)
    }
    if (message.type === 'answer'){
        addAnswer(message.answer)
    }
    if (message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async (id) => {
    console.log("user joined", id)
    createOffer(id);
}


let createPeerConnection = async (id) => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById("video-2").srcObject = remoteStream;


    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
        document.getElementById("video-1").srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    });    

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)})
    }

    peerConnection.onicecandidate = async (event) => {
        
        if (event.candidate) {
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, id)
        }
    }

}

let createOffer = async (id) => {

    await createPeerConnection(id)

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, id)
}

let createAnswer = async (id, offer) => {
    await createPeerConnection(id)
    await peerConnection.setRemoteDescription(offer)
    document.getElementById("video-2").style.display = "block"

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)


    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, id)
}


let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
    document.getElementById("video-2").style.display = "block"
}

let leaveChannel = async () => {
    channel.leave()
    client.logout()
    document.location = 'lobby.html'
}

let mic = document.getElementById("mic-control")
let camera = document.getElementById("camera-control")
let exit = document.getElementById("leave-room-control")

let handleAudio = async () => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')
    if (audioTrack.enabled){
        audioTrack.enabled = false
        mic.style.backgroundColor = 'brown'
    }
    else {
        audioTrack.enabled = true
        mic.style.backgroundColor = 'aquamarine'
    }
}

let handleVideo = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')
    if (videoTrack.enabled){
        videoTrack.enabled = false
        camera.style.backgroundColor = 'brown'
    }
    else {
        videoTrack.enabled = true
        camera.style.backgroundColor = 'aquamarine'
    }
}


mic.addEventListener('click', handleAudio)
camera.addEventListener('click', handleVideo)
exit.addEventListener('click', leaveChannel)
window.addEventListener('beforeunload', leaveChannel)

init();