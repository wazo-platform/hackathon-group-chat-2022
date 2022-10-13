import { createEffect, createSignal, For, onCleanup } from "solid-js";

import { getWazoClient } from './services';

let refModal;
let refName;
let refUsers;
export default (props) => {
  const client = getWazoClient();
  const [users, setUsers] = createSignal([]);

  createEffect(() => {
    refModal.showModal();

    client.dird.fetchWazoSource('default').then(async response => {
      const defaultSource = response?.items?.[0];
      if(defaultSource) {
        // @todo no pagination (but it's an hackaton)
        const responseContacts = await client.dird.fetchWazoContacts(defaultSource, { order: 'firstname' });
        setUsers(responseContacts);
      }
    });

    refModal.addEventListener('close', () => {
      props.handleFormSubmit();
    });

    onCleanup(() => {
      refModal.addEventListener('close');
    })
  })

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const selectedUsers = [{ uuid: localStorage.getItem('currentUserUuid') }];
    for (let option of refUsers.options) {
      if(option.selected && Boolean(option.value) && option.value !== localStorage.getItem('currentUserUuid')) {
        selectedUsers.push({ uuid: option.value });
      }
    }

    client.chatd.createRoom(refName.value, selectedUsers);
    refModal.close();
  }


  return (
    <dialog id="create-room-modal" ref={refModal}>
      <form onSubmit={handleFormSubmit}>
        <p>
          <label>Room Name</label>
          <input type="text" name="name" required ref={refName} />
        </p>

        <p>
          <label>Users</label>
          <select name="users" required multiple ref={refUsers}>
            <option value="" disabled selected hidden>Choose users</option>
            <For each={users()}>
              { (user) => <option value={user.uuid} disabled={user.uuid === localStorage.getItem('currentUserUuid')}>{ user.name }</option> }
            </For>
          </select>
        </p>

        <button type="submit">Create</button>
      </form>
    </dialog>
  )
}
