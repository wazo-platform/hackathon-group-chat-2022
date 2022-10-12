import { For, createSignal, createEffect } from "solid-js";
import SolidMarkdown from "solid-markdown";
import { WazoApiClient } from '@wazo/sdk'

const urlParams = new URLSearchParams(window.location.search);
const host = urlParams.get('host');
const username = urlParams.get('username');
const password = urlParams.get('password');

const client = new WazoApiClient({
  server: host,
  agent: null, // http(s).Agent instance, allows custom proxy, unsecured https, certificate etc.
  clientId: null, // Set an identifier for your app when using refreshToken
  isMobile: false,
});

import styles from './App.module.scss';

const expiration = 60 * 2;
let refMessage;
let refRoom;

function App() {
  const [currentUser, setCurrentUser] = createSignal(null);
  const [rooms, setRooms] = createSignal(null);
  const [room, setRoom] = createSignal(null);
  const [messages, setMessages] = createSignal(null);

  createEffect(() => {
    client.auth.logIn({
      expiration,
      username: username,
      password: password,
    }).then(response => {
      client.setToken(response.token)
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
    client.chatd.sendRoomMessage(room().uuid, messagePayload).then(() => {
      // @todo Listen to websocket instaed
      // @todo Listen to websocket instaed
      client.chatd.getRoomMessages(room().uuid).then(messagesResponse => {
        setMessages(messagesResponse.reverse());
        scrollBottom();
      })
    });
  }

  if(!host || !username || !password) {
    return <p>Please defined server config in the URL: <code>{ window.location.origin }/?host=MY_HOST&username=MY_USERNAME&password=MY_PASSWORD</code></p>
  }

  return (
    <div className={styles.page}>
  {(item) => <div>{item}</div>}
      <div className={styles.rooms}>
        <For each={rooms()} fallback={<div>Loading Rooms...</div>}>
          {
            (room) => (
              <button onClick={() => {
                handleRoomChange(room.uuid)
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
          <button>Emoji</button>
        </div>
      </div>

    </div>
  );
}

export default App;
