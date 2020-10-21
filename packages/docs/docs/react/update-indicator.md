---
title: Update Indicator
---

Update indicator is useful if some component reads from async selectors.

Let's consider such case

```ts
const userStore = store({ activeUserId: '3' });
```

We have simple store that holds information about active user id.

Now, we can have selector that will fetch active user info when needed:

```ts
const activeUserInfo = selector(async () => {
  const userId = userStore.activeUserId;

  const userData = await userApi.fetchUser(userId);

  return userData;
});
```

And now, we have some component that renders active user info:

```tsx
const ActiveUserInfo = view(() => {
  const userInfo = activeUserInfo.value;

  return <div>Active user email is {userInfo.email}.</div>;
});
```

On first render (mount) - our component will suspend.

However, next time `activeUserId` will change, our component will not know about it until `activeUserInfo` will update itself with new value.

We can modify this behaviour with such code:

```tsx
const ActiveUserInfo = view(() => {
  const userInfo = activeUserInfo.value;

  return (
    <div>
      <ActiveUserInfo.UpdateIndicator indicator={<div>Updating user data...</div>}>
      Active user email is {userInfo.email}.
    </div>
  );
})
```

This way, every time some used selector will be updating _in the background_, our component will display proper information about it.

:::caution

`View.UpdateIndicator` can only be rendered directly inside corresponding view.

Such code is incorrect and will throw:

```tsx
const ActiveUserInfo = view(() => {
  const userInfo = activeUserInfo.value;

  return (
    <div>
      <UpdateInfo />
      Active user email is {userInfo.email}.
    </div>
  );
});

function UpdateInfo() {
  // ! ActiveUserInfo.UpdateIndicator is not rendered directly inside ActiveUserInfo view. This code will throw!
  return <ActiveUserInfo.UpdateIndicator indicator={<div>Updating user data...</div>}>
}
```

:::
