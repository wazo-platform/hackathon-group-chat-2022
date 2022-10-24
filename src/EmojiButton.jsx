import styles from './EmojiButton.module.scss';
import { PICKET_TYPE_GLOBAL, PICKET_TYPE_REACTION } from './constants';

export const closeEmojiPicker = (e) => {
  // If manipulating emoji-picker, ignore close
  if (e?.path?.some((element) => element.nodeName === 'EMOJI-PICKER')) {
    return;
  }

  e?.stopPropagation();
  e?.preventDefault();
  window.removeEventListener('click', closeEmojiPicker);
  document.querySelector('#emoji-picker').classList.add('hide');
};

const EmojiButton = (props) => {
  const toggleEmojiPicker = (e) => {
    const elementPosition = e.target.getBoundingClientRect();
    const pickerWidth = 344;
    const pickerHeight = 398;

    const x = elementPosition.right - pickerWidth;
    let y = elementPosition.y - pickerHeight - 12;

    if (y < 0) {
      y = elementPosition.bottom + 12;
    }

    const emojiPicker = document.querySelector('#emoji-picker');
    emojiPicker.style.left = `${x}px`;
    emojiPicker.style.top = `${y}px`;

    emojiPicker.classList.remove('hide');
    props?.setPickerType(e.target.id === 'create-message-emoji' ? PICKET_TYPE_GLOBAL : PICKET_TYPE_REACTION);

    setTimeout(() => {
      window.addEventListener('click', closeEmojiPicker);
    }, 250);
  };

  return (
    <button id={props.id} class={`${styles.buttonEmoji} emoji-button`} onClick={toggleEmojiPicker}>
      😀
    </button>
  );
};

export default EmojiButton;
