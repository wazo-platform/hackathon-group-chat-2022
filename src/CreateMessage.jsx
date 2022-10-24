import EmojiButton from './EmojiButton';
import styles from './CreateMessage.module.scss';
import { getWazoClient } from './services';

let refFormCreateMessage;
let refMessage;

const CreateMessage = (props) => {
  const client = getWazoClient();

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const messagePayload = {
      content: refMessage.value,
      alias: [props.currentUser.firstName, props.currentUser.lastName].filter(Boolean).join(' '),
    };
    client.chatd.sendRoomMessage(props.room.uuid, messagePayload);
  };

  const handleSubmitOnEnter = (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  return (
    <div class={styles.createMessage}>
      <form ref={refFormCreateMessage} onSubmit={handleFormSubmit}>
        <textarea
          id="create-message-input"
          ref={refMessage}
          onKeyDown={handleSubmitOnEnter}
          placeholder="Write you message here..."
          required
        />
      </form>
      <EmojiButton id="create-message-emoji" setPickerType={props.setPickerType} />
    </div>
  );
};

export default CreateMessage;
