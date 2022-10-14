import styles from './MessageReactions.module.scss';

export default (props) => {
  const currentUserUuid = localStorage.getItem('currentUserUuid')
  const combinedReactions = props?.reactions?.reduce((acc, { emoji, user_uuid }) => ({
    ...acc,
    [emoji]: {
      count: (acc?.[emoji]?.count || 0) + 1,
      selected: acc?.[emoji]?.selected || currentUserUuid === user_uuid,
    },
  }), {})


  return (
    <p className={styles.roomMessageReaction}>
      {
        Object.keys(combinedReactions).map(emoji => (
          <span
            data-count={ combinedReactions[emoji].count }
            className="message-reaction"
            classList={{ selected: combinedReactions[emoji].selected }}
          >
            { emoji }
          </span>
        ))
      }
    </p>
  )
}
