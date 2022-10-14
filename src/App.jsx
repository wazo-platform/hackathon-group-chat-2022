import {
  For, createSignal, Show, onMount,
} from 'solid-js';
import SolidMarkdown from 'solid-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGFM from 'remark-gfm';
import remarkGemoji from 'remark-gemoji';
import { WazoWebSocketClient } from '@wazo/sdk';
import 'emoji-picker-element';

import { host, username, password } from './constants';
import { getWazoClient, getWazoRequester, playNotification } from './services';

import styles from './App.module.scss';
import CreateRoom from './CreateRoom';
import MessageReactions from './MessageReactions';

const client = getWazoClient();

const expiration = 60 * 60;
const isConfigurationDefined = host && username && password;
let refFormCreateMessage;
let refMessage;
let refRoom;
let refEmojiPicker;
let ws;

const PICKET_TYPE_GLOBAL = 'global';
const PICKET_TYPE_REACTION = 'reaction';

const NotConfigured = () => (
  <p>
    Please defined server config in the URL:{' '}
    <code>{window.location.origin}/?host=MY_HOST&username=MY_USERNAME&password=MY_PASSWORD</code>
  </p>
);

function App() {
  const [currentUser, setCurrentUser] = createSignal(null);
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);

  const [showPicker, setShowPicker] = createSignal(false);
  const [pickerType, setPickerType] = createSignal(PICKET_TYPE_GLOBAL);

  const [rooms, setRooms] = createSignal(null);
  const [room, setRoom] = createSignal(null);
  const [messages, setMessages] = createSignal(null);
  const [currentMessage, setCurrentMessage] = createSignal(null);

  const closeEmojiPicker = (e) => {
    // If manipulating emoji-picker, ignore close
    if (e?.path?.some((element) => element.nodeName === 'EMOJI-PICKER')) {
      return;
    }

    e?.stopPropagation();
    e?.preventDefault();
    window.removeEventListener('click', closeEmojiPicker);
    setShowPicker(false);
  };

  const handleSetEmoji = (event, forcedEmoji) => {
    closeEmojiPicker();
    const emojiChar = event?.detail?.unicode || forcedEmoji;

    if (pickerType() === PICKET_TYPE_GLOBAL) {
      refMessage.value = `${refMessage.value} ${emojiChar}`;
      refMessage.focus();
      return;
    }

    if (pickerType() === PICKET_TYPE_REACTION) {
      const requester = getWazoRequester();
      const userUuid = localStorage.getItem('currentUserUuid');
      const alreadyReacted = currentMessage()?.reactions.some(
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
    refMessage.value = '';
    refRoom.scrollTop = refRoom.scrollHeight;
  };

  const handleRoomChange = (newRoom) => {
    setRoom(newRoom);

    client.chatd.getRoomMessages(newRoom.uuid).then((messagesResponse) => {
      setMessages(messagesResponse.reverse());
      scrollBottom();
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const messagePayload = {
      content: refMessage.value,
      alias: [currentUser().firstName, currentUser().lastName].filter(Boolean).join(' '),
    };
    client.chatd.sendRoomMessage(room().uuid, messagePayload);
  };

  const handleSubmitOnEnter = (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const toggleEmojiPicker = (e) => {
    const elementPosition = e.target.getBoundingClientRect();
    const pickerWidth = 344;
    const pickerHeight = 398;

    const x = elementPosition.right - pickerWidth;
    let y = elementPosition.y - pickerHeight - 12;

    if (y < 0) {
      y = elementPosition.bottom + 12;
    }

    refEmojiPicker.style.left = `${x}px`;
    refEmojiPicker.style.top = `${y}px`;

    setShowPicker(!showPicker());
    setPickerType(e.target.id === 'create-message-emoji' ? PICKET_TYPE_GLOBAL : PICKET_TYPE_REACTION);

    setTimeout(() => {
      window.addEventListener('click', closeEmojiPicker);
    }, 250);
  };

  const toggleCreateRoom = (e) => {
    e?.preventDefault();

    if (showCreateRoom()) {
      closeEmojiPicker();
      setShowCreateRoom(!showCreateRoom());
      return;
    }

    setShowCreateRoom(true);
  };

  const handleMessageClick = (e, message) => {
    if (e?.target?.href?.indexOf('https://') || e?.target?.href?.indexOf('http://')) {
      return;
    }

    e.preventDefault();
    setCurrentMessage(message);

    if (e.target.classList.contains('message-reaction')) {
      setPickerType(PICKET_TYPE_REACTION);
      handleSetEmoji(null, e.target.innerText);
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
        <div class={styles.rooms}>
          <button onClick={toggleCreateRoom}>
            <strong>➕ Create Room</strong>
          </button>
          <For each={rooms()} fallback={<div>Loading Rooms...</div>}>
            {(roomItem) => (
              <button
                onClick={() => {
                  handleRoomChange(roomItem);
                }}
              >
                {roomItem.name}
              </button>
            )}
          </For>
        </div>

        <div ref={refRoom} class={styles.room}>
          <div class={styles.roomMessages}>
            <For each={messages()} fallback={<div>Empty Chat...</div>}>
              {(message) => (
                <div
                  class={styles.roomMessage}
                  classList={{
                    [styles.roomMessageSelected]: currentMessage()?.uuid === message.uuid && showPicker(),
                  }}
                  onClick={(e) => handleMessageClick(e, message)}
                >
                  <p class={styles.roomMessageAuthor}>{message.alias}</p>
                  <SolidMarkdown
                    class={styles.roomMessageContent}
                    children={message.content}
                    linkTarget="_blank"
                    remarkPlugins={[remarkBreaks, remarkGFM, remarkGemoji]}
                  />
                  <MessageReactions reactions={message?.reactions} />
                  <button id="add-reaction" class={styles.buttonEmoji} onClick={toggleEmojiPicker}>
                    😀
                  </button>
                </div>
              )}
            </For>
          </div>

          <div class={styles.createMessage}>
            <form ref={refFormCreateMessage} onSubmit={handleFormSubmit}>
              <textarea
                ref={refMessage}
                onKeyDown={handleSubmitOnEnter}
                placeholder="Write you message here..."
                required
              />
            </form>
            <button id="create-message-emoji" class={styles.buttonEmoji} onClick={toggleEmojiPicker}>
              😀
            </button>
          </div>
        </div>

        <emoji-picker ref={refEmojiPicker} class={showPicker() ? '' : 'hide'} />

        <Show when={showCreateRoom()}>
          <CreateRoom handleFormSubmit={toggleCreateRoom} />
        </Show>
      </div>
    </Show>
  );
}

export default App;
