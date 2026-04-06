/**
 * Game Sounds Hook
 *
 * This hook provides sound effect functions for all casino games.
 * Currently uses empty placeholders - add actual audio files and update the functions.
 *
 * Sound files to add to /public/sounds/:
 * - button-click.mp3 - General button click sound
 * - spin-start.mp3 - Slot machine spin start
 * - reel-stop.mp3 - Individual reel stop
 * - roulette-spin.mp3 - Roulette wheel spinning
 * - ball-drop.mp3 - Roulette ball dropping
 * - dice-shake.mp3 - Dice shaking
 * - dice-roll.mp3 - Dice rolling
 * - card-deal.mp3 - Card dealing/sliding
 * - card-flip.mp3 - Card flipping
 * - wheel-tick.mp3 - Wheel pointer tick
 * - wheel-spin.mp3 - Lucky wheel spinning
 * - win-small.mp3 - Small win (1-10x bet)
 * - win-medium.mp3 - Medium win (10-50x bet)
 * - win-big.mp3 - Big win (50x+ bet)
 * - lose.mp3 - Lose/game over
 * - jackpot.mp3 - Jackpot/biggest win
 * - coin-drop.mp3 - Coins dropping (payout)
 * - suspense.mp3 - Suspense/tension build up
 */

import { useCallback, useRef } from 'react';

// Sound cache to prevent reloading
const soundCache: Map<string, HTMLAudioElement> = new Map();

/**
 * Load and cache a sound file
 * TODO: Replace with actual audio files
 */
const loadSound = (soundName: string): HTMLAudioElement | null => {
  // Placeholder - return null until audio files are added
  // Example implementation:
  // if (soundCache.has(soundName)) {
  //   return soundCache.get(soundName)!;
  // }
  // const audio = new Audio(`/sounds/${soundName}.mp3`);
  // audio.preload = 'auto';
  // soundCache.set(soundName, audio);
  // return audio;
  return null;
};

/**
 * Play a cached sound
 */
const playCachedSound = (soundName: string, volume: number = 1): void => {
  const audio = loadSound(soundName);
  if (audio) {
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch((err) => {
      console.warn(`Failed to play sound ${soundName}:`, err);
    });
  }
};

export const useGameSounds = () => {
  // Track playing sounds for cleanup
  const activeSounds = useRef<Set<string>>(new Set());

  /**
   * UI Sound: Button click
   * Trigger: Any button press
   */
  const playButtonClick = useCallback(() => {
    // TODO: Add /public/sounds/button-click.mp3
    // playCachedSound('button-click', 0.5);
    console.debug('[SOUND] Button click');
  }, []);

  /**
   * Game Sound: Slot machine spin start
   * Trigger: When slots start spinning
   */
  const playSpinStart = useCallback(() => {
    // TODO: Add /public/sounds/spin-start.mp3
    // playCachedSound('spin-start', 0.7);
    console.debug('[SOUND] Spin start');
  }, []);

  /**
   * Game Sound: Reel stop
   * Trigger: When each individual slot reel stops
   */
  const playReelStop = useCallback((reelIndex: number) => {
    // TODO: Add /public/sounds/reel-stop.mp3
    // Slight pitch variation per reel
    // playCachedSound('reel-stop', 0.6 - (reelIndex * 0.05));
    console.debug(`[SOUND] Reel ${reelIndex + 1} stopped`);
  }, []);

  /**
   * Game Sound: Roulette wheel spin
   * Trigger: When roulette wheel starts spinning
   */
  const playRouletteSpin = useCallback(() => {
    // TODO: Add /public/sounds/roulette-spin.mp3
    // Longer looping sound
    // playCachedSound('roulette-spin', 0.6);
    console.debug('[SOUND] Roulette wheel spinning');
  }, []);

  /**
   * Game Sound: Ball drop
   * Trigger: When roulette ball drops into slot
   */
  const playBallDrop = useCallback(() => {
    // TODO: Add /public/sounds/ball-drop.mp3
    // playCachedSound('ball-drop', 0.7);
    console.debug('[SOUND] Ball dropped');
  }, []);

  /**
   * Game Sound: Dice shake
   * Trigger: Dice rolling/shaking animation
   */
  const playDiceShake = useCallback(() => {
    // TODO: Add /public/sounds/dice-shake.mp3
    // playCachedSound('dice-shake', 0.6);
    console.debug('[SOUND] Dice shaking');
  }, []);

  /**
   * Game Sound: Dice roll
   * Trigger: When dice are released
   */
  const playDiceRoll = useCallback(() => {
    // TODO: Add /public/sounds/dice-roll.mp3
    // playCachedSound('dice-roll', 0.7);
    console.debug('[SOUND] Dice rolling');
  }, []);

  /**
   * Game Sound: Card deal
   * Trigger: When card slides onto table
   */
  const playCardDeal = useCallback(() => {
    // TODO: Add /public/sounds/card-deal.mp3
    // playCachedSound('card-deal', 0.5);
    console.debug('[SOUND] Card dealt');
  }, []);

  /**
   * Game Sound: Card flip
   * Trigger: When hidden card is revealed
   */
  const playCardFlip = useCallback(() => {
    // TODO: Add /public/sounds/card-flip.mp3
    // playCachedSound('card-flip', 0.6);
    console.debug('[SOUND] Card flipped');
  }, []);

  /**
   * Game Sound: Wheel tick
   * Trigger: Lucky wheel pointer hitting segments
   */
  const playWheelTick = useCallback(() => {
    // TODO: Add /public/sounds/wheel-tick.mp3
    // Short mechanical tick
    // playCachedSound('wheel-tick', 0.4);
    console.debug('[SOUND] Wheel tick');
  }, []);

  /**
   * Game Sound: Wheel spin
   * Trigger: Lucky wheel spinning
   */
  const playWheelSpin = useCallback(() => {
    // TODO: Add /public/sounds/wheel-spin.mp3
    // Longer spinning sound
    // playCachedSound('wheel-spin', 0.6);
    console.debug('[SOUND] Wheel spinning');
  }, []);

  /**
   * Game Sound: Suspense/ tension
   * Trigger: During the suspense delay before revealing result
   */
  const playSuspense = useCallback(() => {
    // TODO: Add /public/sounds/suspense.mp3
    // Rising tension sound
    // playCachedSound('suspense', 0.5);
    console.debug('[SOUND] Suspense building');
  }, []);

  /**
   * Win Sound: Small win (1-10x bet)
   * Trigger: Small wins
   */
  const playWinSmall = useCallback(() => {
    // TODO: Add /public/sounds/win-small.mp3
    // playCachedSound('win-small', 0.7);
    console.debug('[SOUND] Small win');
  }, []);

  /**
   * Win Sound: Medium win (10-50x bet)
   * Trigger: Medium wins
   */
  const playWinMedium = useCallback(() => {
    // TODO: Add /public/sounds/win-medium.mp3
    // playCachedSound('win-medium', 0.8);
    console.debug('[SOUND] Medium win');
  }, []);

  /**
   * Win Sound: Big win (50x+ bet)
   * Trigger: Big wins
   */
  const playWinBig = useCallback(() => {
    // TODO: Add /public/sounds/win-big.mp3
    // playCachedSound('win-big', 1.0);
    console.debug('[SOUND] BIG WIN!');
  }, []);

  /**
   * Win Sound: Jackpot
   * Trigger: Maximum/biggest possible win
   */
  const playJackpot = useCallback(() => {
    // TODO: Add /public/sounds/jackpot.mp3
    // playCachedSound('jackpot', 1.0);
    console.debug('[SOUND] JACKPOT!!!');
  }, []);

  /**
   * Lose Sound: Game over
   * Trigger: When player loses
   */
  const playLose = useCallback(() => {
    // TODO: Add /public/sounds/lose.mp3
    // playCachedSound('lose', 0.6);
    console.debug('[SOUND] Lose');
  }, []);

  /**
   * Game Sound: Coin drop
   * Trigger: When coins/payout is shown
   */
  const playCoinDrop = useCallback(() => {
    // TODO: Add /public/sounds/coin-drop.mp3
    // playCachedSound('coin-drop', 0.5);
    console.debug('[SOUND] Coins dropping');
  }, []);

  /**
   * Play appropriate win sound based on win amount
   */
  const playWin = useCallback((winAmount: number, betAmount: number) => {
    const multiplier = winAmount / betAmount;

    if (multiplier >= 100) {
      playJackpot();
    } else if (multiplier >= 50) {
      playWinBig();
    } else if (multiplier >= 10) {
      playWinMedium();
    } else {
      playWinSmall();
    }

    // Also play coin drop after a short delay
    setTimeout(() => playCoinDrop(), 300);
  }, [playJackpot, playWinBig, playWinMedium, playWinSmall, playCoinDrop]);

  /**
   * Stop all playing sounds
   */
  const stopAllSounds = useCallback(() => {
    soundCache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeSounds.current.clear();
  }, []);

  return {
    // UI Sounds
    playButtonClick,

    // Game Sounds
    playSpinStart,
    playReelStop,
    playRouletteSpin,
    playBallDrop,
    playDiceShake,
    playDiceRoll,
    playCardDeal,
    playCardFlip,
    playWheelTick,
    playWheelSpin,
    playSuspense,
    playCoinDrop,

    // Win/Lose Sounds
    playWin,
    playWinSmall,
    playWinMedium,
    playWinBig,
    playJackpot,
    playLose,

    // Utility
    stopAllSounds,
  };
};

export default useGameSounds;
