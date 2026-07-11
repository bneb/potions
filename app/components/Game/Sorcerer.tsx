
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import styles from './sorcerer.module.css';
import { audioEngine } from '@/lib/audio/audioEngine';

interface SorcererProps {
    isCasting: boolean;
}

// 5 random hover animations
const HOVER_ANIMATIONS = [
    styles.hoverWiggle,
    styles.hoverBounce,
    styles.hoverSpin,
    styles.hoverFloat,
    styles.hoverGlow,
] as const;

export function Sorcerer({ isCasting }: SorcererProps) {
    const [hoverAnimation, setHoverAnimation] = useState<string | null>(null);
    const [isClicked, setIsClicked] = useState(false);

    const handleMouseEnter = useCallback(() => {
        // Pick a random hover animation
        const randomIndex = Math.floor(Math.random() * HOVER_ANIMATIONS.length);
        setHoverAnimation(HOVER_ANIMATIONS[randomIndex]);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverAnimation(null);
    }, []);

    const handleClick = useCallback(() => {
        setIsClicked(true);
        audioEngine.playMagic();
        // Reset after animation
        setTimeout(() => setIsClicked(false), 800);
    }, []);

    return (
        <div
            className="fixed bottom-24 left-6 z-30 cursor-pointer hidden md:block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div className={cn(styles.stage)}>
                <div className={cn(
                    styles.sorcererRig,
                    isCasting && styles.casting,
                    isClicked && styles.clicked,
                    hoverAnimation
                )}>

                    {/* ========== HAT (Sorting Hat inspired) ========== */}
                    <div className={styles.hatGroup}>
                        <div className={styles.hatCone}>
                            <div className={styles.hatConeBase}></div>
                            <div className={styles.hatConeHighlight}></div>
                            <div className={styles.hatConeShadow}></div>
                            <div className={styles.hatTip}></div>
                            {/* Subtle decorations */}
                            <span className={styles.hatStar}>✦</span>
                            <span className={styles.hatStar}>✦</span>
                        </div>
                        <div className={styles.hatBrimGroup}>
                            <div className={styles.hatBrimBase}></div>
                            <div className={styles.hatBrimHighlight}></div>
                            <div className={styles.hatBand}>
                                <div className={styles.hatBandGem}></div>
                            </div>
                        </div>
                    </div>

                    {/* ========== HEAD ========== */}
                    <div className={styles.headGroup}>
                        {/* Messy Harry Potter hair */}
                        <div className={styles.hairBase}>
                            <div className={styles.hairStrand}></div>
                            <div className={styles.hairStrand}></div>
                            <div className={styles.hairStrand}></div>
                            <div className={styles.hairStrand}></div>
                            <div className={styles.hairStrand}></div>
                        </div>

                        <div className={styles.faceBase}>
                            <div className={styles.faceHighlight}></div>
                            <div className={styles.faceShadow}></div>

                            {/* Ears */}
                            <div className={cn(styles.ear, styles.left)}>
                                <div className={styles.earInner}></div>
                            </div>
                            <div className={cn(styles.ear, styles.right)}>
                                <div className={styles.earInner}></div>
                            </div>

                            {/* Eyebrows */}
                            <div className={styles.eyebrowGroup}>
                                <div className={cn(styles.eyebrow, styles.left)}></div>
                                <div className={cn(styles.eyebrow, styles.right)}></div>
                            </div>



                            {/* Eyes */}
                            <div className={styles.eyeGroup}>
                                <div className={cn(styles.eyeSocket, styles.left)}>
                                    <div className={styles.eyeWhite}>
                                        <div className={styles.iris}>
                                            <div className={styles.pupil}></div>
                                        </div>
                                        <div className={styles.eyeHighlight}></div>
                                    </div>
                                </div>
                                <div className={cn(styles.eyeSocket, styles.right)}>
                                    <div className={styles.eyeWhite}>
                                        <div className={styles.iris}>
                                            <div className={styles.pupil}></div>
                                        </div>
                                        <div className={styles.eyeHighlight}></div>
                                    </div>
                                </div>
                            </div>



                            {/* Nose */}
                            <div className={styles.noseGroup}>
                                <div className={styles.noseBase}>
                                    <div className={styles.noseHighlight}></div>
                                </div>
                            </div>

                            {/* Mouth */}
                            <div className={styles.mouthGroup}>
                                <div className={styles.smile}></div>
                            </div>

                            {/* Cheeks */}
                            <div className={cn(styles.cheek, styles.left)}></div>
                            <div className={cn(styles.cheek, styles.right)}></div>
                        </div>
                    </div>

                    {/* ========== BODY (Druid Robes) ========== */}
                    <div className={styles.bodyGroup}>
                        <div className={styles.robeBase}>
                            <div className={styles.robeFold}></div>
                            <div className={styles.robeFold}></div>
                            <div className={styles.robeFold}></div>
                            <div className={styles.robeHighlight}></div>

                            {/* Bronze collar trim */}
                            <div className={styles.collarGroup}>
                                <div className={styles.collarBase}></div>
                                <div className={styles.collarStripe}></div>
                            </div>

                            {/* Celtic knot emblem */}
                            <div className={styles.crestArea}>
                                <div className={styles.crest}></div>
                            </div>

                            <div className={styles.robeHem}></div>
                        </div>


                        {/* Wand Arm - Ergonomic grip */}
                        <div className={styles.wandArm}>
                            <div className={styles.sleeveUpper}>
                                <div className={styles.elbowJoint}></div>
                            </div>
                            <div className={styles.sleeveLower}></div>
                            <div className={styles.sleeveCuff}></div>
                            <div className={styles.handGrip}>
                                <div className={styles.palm}></div>
                                <div className={styles.thumb}></div>
                                <div className={styles.fingers}>
                                    <div className={styles.finger}></div>
                                    <div className={styles.finger}></div>
                                    <div className={styles.finger}></div>
                                    <div className={styles.finger}></div>
                                </div>
                                {/* Wand held through grip */}
                                <div className={styles.wand}>
                                    <div className={styles.wandHandle}></div>
                                    <div className={styles.wandShaft}></div>
                                    <div className={styles.wandTip}>
                                        <div className={styles.magicGlow}>
                                            <div className={styles.sparkle}></div>
                                            <div className={styles.sparkle}></div>
                                            <div className={styles.sparkle}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Other Arm */}
                        <div className={cn(styles.armGroup, styles.right)}>
                            <div className={styles.sleeveUpper}></div>
                            <div className={styles.sleeveLower}></div>
                            <div className={styles.sleeveCuff}></div>
                            <div className={styles.hand}>
                                <div className={styles.fingers}>
                                    <div className={styles.finger}></div>
                                    <div className={styles.finger}></div>
                                    <div className={styles.finger}></div>
                                </div>
                            </div>
                        </div>

                        {/* Shoes */}
                        <div className={styles.shoesGroup}>
                            <div className={styles.shoe}></div>
                            <div className={styles.shoe}></div>
                        </div>
                    </div>
                </div>

                {/* Shadow */}
                <div className={styles.shadow}></div>

                {/* Click burst effect */}
                {isClicked && (
                    <div className={styles.clickBurst}>
                        <div className={styles.burstRing}></div>
                        <div className={styles.burstRing}></div>
                        <div className={styles.burstRing}></div>
                    </div>
                )}
            </div>
        </div>
    );
}
