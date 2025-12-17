/** Запросити користувача в поточну кімнату */
function inviteUserToRoom() {
  if (!this.accessToken) {
    console.error('No accessToken');
    return;
  }
  if (!this.roomId) {
    console.warn('Select a room first');
    this.error = 'Select a room first';
    return;
  }
  const userId = (this.inviteUser || '').trim();
  if (!userId) {
    this.error = 'Enter Matrix user ID to invite (e.g., @user:matrix.org)';
    return;
  }

  fetch(
    `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    }
  )
    .then(r => r.json())
    .then(data => {
      if (data.errcode) {
        console.error('Invite error:', data);
        this.error = data.error || 'Invite failed';
        return;
      }
      this.error = '';
      this.inviteUser = '';
      console.log('✅ Invited:', userId);
      // (не обов’язково) перезавантажити учасників
      this.fetchRoomMembers && this.fetchRoomMembers();
    })
    .catch(e => {
      console.error('Invite exception:', e);
      this.error = 'Invite failed (network?)';
    });
}

/** Приєднатися до кімнати за roomId або alias */
function joinRoom() {
  if (!this.accessToken) {
    console.error('No accessToken');
    return;
  }
  const target = (this.joinRoomId || '').trim();
  if (!target) {
    this.error = 'Enter room ID or alias to join';
    return;
  }

  fetch(
    `https://matrix.org/_matrix/client/r0/join/${encodeURIComponent(target)}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    }
  )
    .then(r => r.json())
    .then(data => {
      if (data.errcode) {
        console.error('Join error:', data);
        this.error = data.error || 'Join failed';
        return;
      }
      // успіх: сервер повертає room_id
      const joinedId = data.room_id || target;
      this.joinRoomId = '';
      this.error = '';
      console.log('✅ Joined room:', joinedId);

      // оновити список кімнат і перейти в неї
      this.fetchRoomsWithNames && this.fetchRoomsWithNames();
      this.switchRoom && this.switchRoom(joinedId);
      this.fetchRoomMembers && this.fetchRoomMembers();
    })
    .catch(e => {
      console.error('Join exception:', e);
      this.error = 'Join failed (network?)';
    });
}

/** Отримати список учасників поточної кімнати */
async function fetchRoomMembers() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
      { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
    );
    const data = await res.json();
    if (data.errcode) {
      console.error('Members error:', data);
      this.roomMembers = [];
      return;
    }
    // data.joined: { "@user:homeserver": { display_name, avatar_url } }
    this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
      userId,
      displayName: info.display_name || userId.split(':')[0].substring(1),
      avatarUrl: info.avatar_url || null
    }));
  } catch (e) {
    console.error('Error fetching room members:', e);
    this.roomMembers = [];
  }
}
