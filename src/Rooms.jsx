import { For, Show, createSignal } from 'solid-js';

import CreateRoom from './CreateRoom';
import { closeEmojiPicker } from './EmojiButton';
import styles from './Rooms.module.scss';

const Rooms = (props) => {
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);

  const toggleCreateRoom = (e) => {
    e?.preventDefault();

    if (showCreateRoom()) {
      closeEmojiPicker();
      setShowCreateRoom(!showCreateRoom());
      return;
    }

    setShowCreateRoom(true);
  };

  return (
    <>
      <div class={styles.rooms}>
        <button onClick={toggleCreateRoom}>
          <strong>➕ Create Room</strong>
        </button>
        <For each={props.rooms()} fallback={<div>Loading Rooms...</div>}>
          {(roomItem) => <button onClick={() => props.onRoomClick(roomItem)}>{roomItem.name}</button>}
        </For>
      </div>

      <Show when={showCreateRoom()}>
        <CreateRoom handleFormSubmit={toggleCreateRoom} />
      </Show>
    </>
  );
};

export default Rooms;
