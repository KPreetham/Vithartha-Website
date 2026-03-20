export const getUserId = (user) => user?._id || user?.id || null;

const onboardingDoneKey = (userId) => `vithartha_onboarding_done_${userId}`;
const walkthroughSeenKey = (userId) => `vithartha_post_login_guide_seen_${userId}`;

export const hasCompletedOnboarding = (user) => {
  const userId = getUserId(user);
  if (!userId) return false;
  if (user?.onboardingCompleted === true) return true;
  return localStorage.getItem(onboardingDoneKey(userId)) === 'true';
};

export const markOnboardingCompleted = (user) => {
  const userId = getUserId(user);
  if (!userId) return;

  localStorage.setItem(onboardingDoneKey(userId), 'true');

  const savedUserStr = localStorage.getItem('user');
  const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
  if (savedUser && getUserId(savedUser) === userId) {
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...savedUser,
        onboardingCompleted: true,
      }),
    );
  }
};

export const clearOnboardingCompleted = (user) => {
  const userId = getUserId(user);
  if (!userId) return;
  localStorage.removeItem(onboardingDoneKey(userId));
};

export const hasSeenPostLoginWalkthrough = (user) => {
  const userId = getUserId(user);
  if (!userId) return false;
  return localStorage.getItem(walkthroughSeenKey(userId)) === 'true';
};

export const markPostLoginWalkthroughSeen = (user) => {
  const userId = getUserId(user);
  if (!userId) return;
  localStorage.setItem(walkthroughSeenKey(userId), 'true');
};

export const clearPostLoginWalkthroughSeen = (user) => {
  const userId = getUserId(user);
  if (!userId) return;
  localStorage.removeItem(walkthroughSeenKey(userId));
};