import { For, createSignal } from "solid-js";

import styles from './App.module.scss';

function App() {
  let refMessage;
  let refRoom;

  const [rooms, setRooms] = createSignal([
    { uuid: 1, name: 'Room 1'},
    { uuid: 2, name: 'Room 2'},
    { uuid: 3, name: 'Room 3'},
    { uuid: 4, name: 'Room 4'},
    { uuid: 5, name: 'Room 5'},
    { uuid: 6, name: 'Room 6'},
    { uuid: 7, name: 'Room 7'},
  ]);
  const [messages, setMessages] = createSignal([
    {
      content: 'Salut je m\'appel francis',
      author: 'Francis C.',
    },
    {
      content: 'Salut je m\'appel francois',
      author: 'Francois',
    },
  ]);

  const handleRoomChange = roomUuid => {
    alert(`Change to room ${roomUuid}`);
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setMessages([...messages(), {
      author: 'Francis C.',
      content: refMessage.value,
    }])

    refMessage.value = '';
    refRoom.scrollTop = refRoom.scrollHeight;
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
                  <p className={styles.roomMessageAuthor}>{ message.author }</p>
                  <div>
                    { message.content }
                  </div>
                </div>
              )
            }
          </For>
        </div>

        <div className={styles.createMessage}>
          <form onSubmit={handleFormSubmit}>
            {/* <textarea ref={refMessage}></textarea> */}
            <input type="text" ref={refMessage} />
          </form>
          <button>Emoji</button>
        </div>
      </div>

    </div>
  );
}

export default App;
