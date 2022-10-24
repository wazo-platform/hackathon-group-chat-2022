import { For } from 'solid-js';
import SolidMarkdown from 'solid-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGFM from 'remark-gfm';
import remarkGemoji from 'remark-gemoji';

import MessageReactions from './MessageReactions';
import EmojiButton from './EmojiButton';
import styles from './RoomMessages.module.scss';

const RoomMessages = (props) => (
  <div class={styles.roomMessages}>
    <For each={props.messages()} fallback={<div>Empty Chat...</div>}>
      {(message) => (
        <div
          class={styles.roomMessage}
          // classList={{
          //   [styles.roomMessageSelected]: currentMessage()?.uuid === message.uuid,
          // }}
          onClick={(e) => props.onMessageClick(e, message)}
        >
          <p class={styles.roomMessageAuthor}>{message.alias}</p>
          <SolidMarkdown
            class={styles.roomMessageContent}
            children={message.content}
            linkTarget="_blank"
            remarkPlugins={[remarkBreaks, remarkGFM, remarkGemoji]}
          />
          <MessageReactions reactions={message?.reactions} />
          <EmojiButton setPickerType={props.setPickerType} />
        </div>
      )}
    </For>
  </div>
);

export default RoomMessages;
