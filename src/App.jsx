import { createSignal, Show, onMount } from 'solid-js';
import { WazoWebSocketClient } from '@wazo/sdk';
import 'emoji-picker-element';

import {
  host, username, password, PICKET_TYPE_GLOBAL, PICKET_TYPE_REACTION,
} from './constants';
import { getWazoClient, getWazoRequester, playNotification } from './services';

import styles from './App.module.scss';
import { closeEmojiPicker } from './EmojiButton';
import CreateMessage from './CreateMessage';
import RoomMessages from './RoomMessages';
import Rooms from './Rooms';
import NotConfigured from './NotConfigured';

const client = getWazoClient();

const expiration = 60 * 60;
const isConfigurationDefined = host && username && password;
let refRoom;
let ws;

function App() {
  const [currentUser, setCurrentUser] = createSignal(null);

  const [pickerType, setPickerType] = createSignal(PICKET_TYPE_GLOBAL);

  const [rooms, setRooms] = createSignal(null);
  const [room, setRoom] = createSignal(null);
  const [messages, setMessages] = createSignal(null);
  const [currentMessage, setCurrentMessage] = createSignal(null);

  const handleSetEmoji = (event, forcedEmoji) => {
    closeEmojiPicker();
    const emojiChar = event?.detail?.unicode || forcedEmoji;

    if (pickerType() === PICKET_TYPE_GLOBAL) {
      const newMessageInput = document.querySelector('#create-message-input');
      newMessageInput.value = `${newMessageInput.value} ${emojiChar}`;
      newMessageInput.focus();
      return;
    }

    if (pickerType() === PICKET_TYPE_REACTION) {
      if (!currentMessage()?.reactions) {
        alert('Emojis are not supported by the server at the moment!');
        return;
      }

      const requester = getWazoRequester();
      const userUuid = localStorage.getItem('currentUserUuid');
      const alreadyReacted = currentMessage()?.reactions?.some(
        (reaction) => reaction.user_uuid === userUuid && reaction.emoji === emojiChar,
      );

      const reactionMethod = alreadyReacted ? 'delete' : 'post';
      const reactionUrlExtra = reactionMethod === 'delete' ? `?emoji=${emojiChar}` : '';
      const reactionUrl = `chatd/1.0/users/${userUuid}/rooms/${room().uuid}/messages/${
        currentMessage().uuid
      }/reactions${reactionUrlExtra}`;
      const reactionPayload = {
        emoji: emojiChar,
      };
      requester.call(reactionUrl, reactionMethod, reactionPayload);
    }
  };

  const scrollBottom = () => {
    document.querySelector('#create-message-input').value = '';
    refRoom.scrollTop = refRoom.scrollHeight;
  };

  const handleRoomChange = (newRoom) => {
    setRoom(newRoom);

    client.chatd.getRoomMessages(newRoom.uuid).then((messagesResponse) => {
      setMessages(messagesResponse.reverse());
      scrollBottom();
    });
  };

  const handleMessageClick = (e, message) => {
    if (e?.target?.href?.indexOf('https://') || e?.target?.href?.indexOf('http://')) {
      return;
    }

    e.preventDefault();
    setCurrentMessage(message);

    if (e.target.classList.contains('emoji-button')) {
      return;
    }

    if (e.target.classList.contains('message-reaction')) {
      setPickerType(PICKET_TYPE_REACTION);
      handleSetEmoji(null, e.target.innerText);
      setCurrentMessage(null);
    }
  };

  onMount(() => {
    document.querySelector('emoji-picker').addEventListener('emoji-click', handleSetEmoji);

    client.auth
      .logIn({
        expiration,
        username,
        password,
      })
      .then((response) => {
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
          version: '2',
        });
        ws.connect();

        ws.on('chatd_user_room_message_created', ({ data }) => {
          if (data?.room?.uuid === room().uuid) {
            localStorage.getItem('currentUserUuid');
            if (data?.user_uuid !== localStorage.getItem('currentUserUuid')) {
              playNotification();
            }

            setMessages((prevMessages) => [...prevMessages, data]);
            scrollBottom();
          }
        });

        ws.on('chatd_user_room_created', (message) => {
          setRooms((prevMessages) => [...prevMessages, message?.data]);
        });

        ws.on('chatd_users_room_message_reaction_created', ({ data, message_uuid }) => {
          setMessages((prevMessages) => prevMessages.map((message) => {
            if (message.uuid !== message_uuid) {
              return message;
            }

            const reactions = message.reactions || [];

            return {
              ...message,
              reactions: [...reactions, data],
            };
          }));
        });

        ws.on('chatd_users_room_message_reaction_deleted', ({ data, message_uuid }) => {
          setMessages((prevMessages) => prevMessages.map((message) => {
            if (message.uuid !== message_uuid) {
              return message;
            }

            const reactions = (message.reactions || []).filter(
              (reaction) => !(reaction.emoji === data.emoji && reaction.user_uuid === data.user_uuid),
            );

            return {
              ...message,
              reactions,
            };
          }));
        });

        // --------

        client.confd.getUser(response.uuid).then((userResponse) => {
          setCurrentUser(userResponse);
        });

        client.chatd.getUserRooms().then((roomsResponse) => {
          setRooms(roomsResponse);

          if (roomsResponse.length > 0) {
            handleRoomChange(roomsResponse[0]);
          }
        });
      });
  });

  return (
    <Show when={isConfigurationDefined} fallback={<NotConfigured />}>
      <div class={styles.page}>
        <Rooms rooms={rooms} onRoomClick={handleRoomChange} />

        <div ref={refRoom} class={styles.room}>
          <RoomMessages messages={messages} onMessageClick={handleMessageClick} setPickerType={setPickerType} />
          <CreateMessage currentUser={currentUser()} room={room()} setPickerType={setPickerType} />
        </div>

        <emoji-picker id="emoji-picker" class="hide" />
      </div>
    </Show>
  );
}

export default App;
