import { For, createSignal, createEffect, Show } from "solid-js";
import SolidMarkdown from "solid-markdown";
import { WazoWebSocketClient } from '@wazo/sdk'
import 'emoji-picker-element';

import { host, username, password } from './constants';
import { getWazoClient, getWazoRequester, playNotification } from './services';

const client = getWazoClient()

import styles from './App.module.scss';
import CreateRoom from "./CreateRoom";
import MessageReactions from "./MessageReactions";

const expiration = 60 * 60;
let refMessage;
let refRoom;
let refEmojiPicker;
let ws;

const PICKET_TYPE_GLOBAL = 'global';
const PICKET_TYPE_REACTION = 'reaction';


function App() {
  const [currentUser, setCurrentUser] = createSignal(null);
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);

  const [showPicker, setShowPicker] = createSignal(false);
  const [pickerType, setPickerType] = createSignal(PICKET_TYPE_GLOBAL);

  const [rooms, setRooms] = createSignal(null, { equals: false });
  const [room, setRoom] = createSignal(null);
  const [messages, setMessages] = createSignal(null);
  const [currentMessage, setCurrentMessage] = createSignal(null);

  createEffect(() => {
    document.querySelector('emoji-picker').addEventListener('emoji-click', handleSetEmoji);

    client.auth.logIn({
      expiration,
      username: username,
      password: password,
    }).then(response => {
      client.setToken(response.token);
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentUserUuid', response.uuid);

      ws = new WazoWebSocketClient({
        host,
        token: response.token,
        events: [
          'chatd_user_room_message_created',
          'chatd_user_room_created',
          'chatd_users_room_message_reaction_created',
          'chatd_users_room_message_reaction_deleted',
        ],
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
        setRooms([...rooms(), message?.data]);
      });

      ws.on('chatd_users_room_message_reaction_created', ({ data, message_uuid }) => {
        const updatedMessage = messages().map(message => {
          if(message.uuid !== message_uuid) {
            return message;
          }

          const reactions = message.reactions || [];

          return {
            ...message,
            reactions: [...reactions, data]
          };
        })

        setMessages(updatedMessage);
      });

      ws.on('chatd_users_room_message_reaction_deleted', ({ data, message_uuid }) => {
        const updatedMessage = messages().map(message => {
          if(message.uuid !== message_uuid) {
            return message;
          }

          const reactions = (message.reactions || []).filter(reaction =>
            !(reaction.emoji === data.emoji && reaction.user_uuid === data.user_uuid));

          return {
            ...message,
            reactions,
          };
        })

        setMessages(updatedMessage);
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

  const handleSetEmoji = (event, forcedEmoji) => {
    closeEmojiPicker();
    const emojiChar = event?.detail?.unicode || forcedEmoji;

    if(pickerType() === PICKET_TYPE_GLOBAL) {
      refMessage.value = `${refMessage.value} ${emojiChar}`;
      refMessage.focus();
      return;
    }

    if(pickerType() === PICKET_TYPE_REACTION) {
      const requester = getWazoRequester();
      const userUuid = localStorage.getItem('currentUserUuid');
      const alreadyReacted = currentMessage()?.reactions.some(reaction => reaction.user_uuid === userUuid && reaction.emoji === emojiChar)

      const reactionMethod = alreadyReacted ? 'delete' : 'post';
      const reactionUrlExtra = reactionMethod === 'delete' ? `?emoji=${emojiChar}` : '';
      const reactionUrl = `chatd/1.0/users/${userUuid}/rooms/${room().uuid}/messages/${currentMessage().uuid}/reactions${reactionUrlExtra}`;
      const reactionPayload = {
        emoji: emojiChar
      };
      requester.call(reactionUrl, reactionMethod, reactionPayload);
      return;
    }
  }

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

  const closeEmojiPicker = (e) => {
    // If manipulating emoji-picker, ignore close
    if(e?.path?.some(element => element.nodeName === 'EMOJI-PICKER')) {
      return;
    }

    e?.stopPropagation();
    e?.preventDefault();
    window.removeEventListener("click", closeEmojiPicker);
    setShowPicker(false);
  }

  const toggleEmojiPicker = (e) => {
    const elementPosition = e.target.getBoundingClientRect();
    const pickerWidth = 344;
    const pickerHeight = 398;

    let x = elementPosition.right - pickerWidth;
    let y = elementPosition.y - pickerHeight - 12;

    if(y < 0) {
      y = elementPosition.bottom + 12;
    }

    refEmojiPicker.style.left = `${x}px`;
    refEmojiPicker.style.top = `${y}px`;

    setShowPicker(!showPicker())
    setPickerType(e.target.id === 'create-message-emoji' ? PICKET_TYPE_GLOBAL : PICKET_TYPE_REACTION);

    setTimeout(() => {
      window.addEventListener("click", closeEmojiPicker);
    }, 250);
  }

  const toggleCreateRoom = (e) => {
    e?.preventDefault();

    if(showCreateRoom()) {
      closeEmojiPicker();
      setShowCreateRoom(!showCreateRoom());
      return;
    }

    setShowCreateRoom(true);
  }

  const handleMessageClick = (e, message) => {
    e.preventDefault();
    setCurrentMessage(message)

    if(e.target.classList.contains('message-reaction')) {
      setPickerType(PICKET_TYPE_REACTION);
      handleSetEmoji(null, e.target.innerText);
      return;
    }
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
          <For each={messages()} fallback={<div>Empty Chat...</div>}>
            {
              (message) => (
                <div
                  className={styles.roomMessage}
                  classList={{ [styles.roomMessageSelected]: currentMessage()?.uuid === message.uuid && showPicker() }}
                  onClick={(e) => handleMessageClick(e, message)}
                >
                  <p className={styles.roomMessageAuthor}>{ message.alias }</p>
                  <SolidMarkdown children={message.content} />
                  <MessageReactions reactions={message?.reactions} />
                  <button id="add-reaction" className={styles.buttonEmoji} onClick={toggleEmojiPicker}>😀</button>
                </div>
              )
            }
          </For>
        </div>

        <div className={styles.createMessage}>
          <form onSubmit={handleFormSubmit}>
            {/* <textarea ref={refMessage}></textarea> */}
            <input type="text" ref={refMessage} placeholder="Write you message here..." required />
          </form>
          <button id="create-message-emoji" className={styles.buttonEmoji} onClick={toggleEmojiPicker}>😀</button>
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
