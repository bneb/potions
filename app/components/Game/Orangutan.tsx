
"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have this utility

// We are porting ~300 lines of complex CSS into a module.
// To keep "Absolute Code Hygiene", we will avoid a 500 line Tailwind string soup.
// We will use CSS Modules or a styled component approach? 
// The user "Enforces Tailwind Discipline", but complex 3D CSS art is better in CSS modules or a clean separate CSS file.
// However, I will use Tailwind arbitrary values where possible and distinct classes for readability.
// actually, for this level of specificity (pixel art via CSS), I'll use a local CSS module or just standard CSS imported here.
// But wait, "Colocation is King". Let's put the CSS in `orangutan.module.css` next to this file.

import styles from './orangutan.module.css';

interface OrangutanProps {
    className?: string;
}

export function Orangutan({ className }: OrangutanProps) {
    return (
        <div className={cn(styles.orangutanProxy, className)}>
            <div className={styles.orangutanScene}>
                <div className={styles.orangutan}>
                    {/* BODY GROUP (Z = 0) */}
                    <div className={styles.bodyGroup}>
                        {/* Legs */}
                        <div className={cn(styles.leg, styles.lLeft)}>
                            <div className={styles.foot}></div>
                        </div>
                        <div className={cn(styles.leg, styles.lRight)}>
                            <div className={styles.foot}></div>
                        </div>

                        <div className={styles.torso}></div>
                        <div className={styles.belly}></div>

                        {/* Arms */}
                        <div className={cn(styles.arm, styles.aLeft)}>
                            <div className={styles.hand}></div>
                        </div>
                        <div className={cn(styles.arm, styles.aRight)}>
                            <div className={styles.hand}></div>
                        </div>
                    </div>

                    {/* HEAD GROUP (Z = 30px) */}
                    <div className={styles.headGroup}>
                        <div className={cn(styles.fluff, styles.fTop)}></div>
                        <div className={cn(styles.fluff, styles.fLeft)}></div>
                        <div className={cn(styles.fluff, styles.fRight)}></div>

                        <div className={styles.headShape}></div>
                        <div className={styles.faceMask}></div>

                        <div className={cn(styles.eye, styles.eLeft)}></div>
                        <div className={cn(styles.eye, styles.eRight)}></div>

                        <div className={styles.muzzle}>
                            <div className={cn(styles.nostril, styles.nLeft)}></div>
                            <div className={cn(styles.nostril, styles.nRight)}></div>
                            <div className={styles.mouth}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
