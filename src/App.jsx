import { For, createSignal, createEffect, Show } from "solid-js";
import SolidMarkdown from "solid-markdown";
import { WazoWebSocketClient } from '@wazo/sdk'
import 'emoji-picker-element';

import { host, username, password } from './constants';
import { getWazoClient, playNotification } from './services';

const client = getWazoClient()

import styles from './App.module.scss';
import CreateRoom from "./CreateRoom";

const expiration = 60 * 60;
let refMessage;
let refRoom;
let refEmojiPicker;
let ws;

function App() {
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);

  const [showPicker, setShowPicker] = createSignal(false);
  const [currentUser, setCurrentUser] = createSignal(null);
  const [rooms, setRooms] = createSignal(null, { equals: false });
  const [room, setRoom] = createSignal(null);
  const [messages, setMessages] = createSignal(null);

  createEffect(() => {
    document.querySelector('emoji-picker').addEventListener('emoji-click', event => {
      refMessage.value = `${refMessage.value} ${event.detail.unicode}`;
      refMessage.focus();
      setShowPicker(false);
    });

    client.auth.logIn({
      expiration,
      username: username,
      password: password,
    }).then(response => {
      client.setToken(response.token);
      localStorage.setItem('currentUserUuid', response.uuid);

      ws = new WazoWebSocketClient({
        host,
        token: response.token,
        events: ['chatd_user_room_message_created', 'chatd_user_room_created'],
        version: '2'
      });
      ws.connect();

      ws.on('chatd_user_room_message_created', ({ data }) => {
        if(data?.room?.uuid === room().uuid) {
          localStorage.getItem('currentUserUuid')
          if(data?.user_uuid !== localStorage.getItem('currentUserUuid')) {
            playNotification();
          }

          setMessages([...messages(), data])
          scrollBottom();
        }
      });

      ws.on('chatd_user_room_created', (message) => {
        console.log(`🤠 -> ws.on -> message`, message?.data);
        console.log([...rooms(), message?.data]);

        // setRooms([...rooms(), message?.data]);
        // setRooms([...rooms(), { uuid: 1, name: 'Test' }]);
        setRooms([{ uuid: 1, name: 'Test' }]);
      });


      // --------

      client.confd.getUser(response.uuid).then(userResponse => {
        setCurrentUser(userResponse);
      });

      client.chatd.getUserRooms().then(roomsResponse => {
        setRooms(roomsResponse);

        if(roomsResponse.length > 0) {
          handleRoomChange(roomsResponse[0])
        }
      });
    });
  })

  const scrollBottom = () => {
    refMessage.value = '';
    refRoom.scrollTop = refRoom.scrollHeight;
  }

  const handleRoomChange = room => {
    setRoom(room);

    client.chatd.getRoomMessages(room.uuid).then(messagesResponse => {
      setMessages(messagesResponse.reverse());
      scrollBottom();
    })
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const messagePayload = {
      content: refMessage.value,
      alias: [currentUser().firstName, currentUser().lastName].filter(Boolean).join(' '),
    }
    client.chatd.sendRoomMessage(room().uuid, messagePayload)
  }

  const toggleEmojiPicker = (e) => {
    const elementPosition = e.target.getBoundingClientRect();
    console.log(`🤠 -> toggleEmojiPicker -> elementPosition`, elementPosition);
    const pickerWidth = 344;
    const pickerHeight = 398;

    const x = elementPosition.right - pickerWidth;
    const y = elementPosition.y - pickerHeight - 12;

    refEmojiPicker.style.left = `${x}px`;
    refEmojiPicker.style.top = `${y}px`;

    setShowPicker(!showPicker())
  }

  const toggleCreateRoom = (e) => {
    e?.preventDefault();
    setShowCreateRoom(!showCreateRoom());
  }

  if(!host || !username || !password) {
    return <p>Please defined server config in the URL: <code>{ window.location.origin }/?host=MY_HOST&username=MY_USERNAME&password=MY_PASSWORD</code></p>
  }

  return (
    <div className={styles.page}>
      <div className={styles.rooms}>
        <button onClick={toggleCreateRoom}><strong>➕ Create Room</strong></button>
        <For each={rooms()} fallback={<div>Loading Rooms...</div>}>
          {
            (room) => (
              <button onClick={() => {
                handleRoomChange(room)
              }}>
                { room.name }
              </button>
            )
          }
        </For>
      </div>

      <div ref={refRoom} className={styles.room}>
        <div className={styles.roomMessages}>
          <For each={messages()} fallback={<div>Loading Messages...</div>}>
            {
              (message) => (
                <div className={styles.roomMessage}>
                  <p className={styles.roomMessageAuthor}>{ message.alias }</p>
                  <SolidMarkdown children={message.content} />
                </div>
              )
            }
          </For>
        </div>

        <div className={styles.createMessage}>
          <form onSubmit={handleFormSubmit}>
            {/* <textarea ref={refMessage}></textarea> */}
            <input type="text" ref={refMessage} required />
          </form>
          <button className={styles.buttonEmoji} onClick={toggleEmojiPicker}>😀</button>
        </div>
      </div>

      <emoji-picker ref={refEmojiPicker} className={showPicker() ? '' : 'hide'}></emoji-picker>

      <Show when={showCreateRoom()}>
        <CreateRoom handleFormSubmit={toggleCreateRoom} />
      </Show>
    </div>
  );
}

export default App;
