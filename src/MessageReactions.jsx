import styles from './MessageReactions.module.scss';

export default (props) => {
  const combinedReactions = props?.reactions?.reduce((acc, { emoji }) => {
    const count = acc?.[emoji] || 0;

    return {
      ...acc,
      [emoji]: count + 1,
    }
  }, {})


  return (
    <p className={styles.roomMessageReaction}>
      {  Object.keys(combinedReactions).map(emoji => <span data-count={ combinedReactions[emoji] } className="message-reaction">{ emoji }</span>) }
    </p>
  )
}
