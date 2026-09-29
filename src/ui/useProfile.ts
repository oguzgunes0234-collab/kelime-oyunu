import { useCallback, useEffect, useState } from 'react';
import { defaultProfile, type Profile } from '../core/profile';
import { clearProfile, loadProfile, saveProfile } from '../core/storage';

/** Profili yükler ve her değişiklikte tarayıcıya yazar. */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile>(() => loadProfile());

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const setProfile = useCallback((p: Profile) => setProfileState(p), []);
  const reset = useCallback(() => {
    clearProfile();
    setProfileState({ ...defaultProfile(new Date()), tutorialDone: true });
  }, []);

  return { profile, setProfile, reset };
}
