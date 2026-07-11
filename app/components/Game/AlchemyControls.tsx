"use client";

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import styles from './alchemyControls.module.css';

interface AlchemyControlsProps {
    heat: number;
    onHeatChange: (heat: number) => void;
    disabled?: boolean;
}

export function AlchemyControls({
    heat,
    onHeatChange,
    disabled = false,
}: AlchemyControlsProps) {

    // Heat dial: tap to cycle through 1-5
    const handleHeatTap = useCallback(() => {
        if (disabled) return;
        const nextHeat = heat >= 5 ? 1 : heat + 1;
        onHeatChange(nextHeat);
    }, [heat, onHeatChange, disabled]);

    return (
        <div className={styles.controls}>
            {/* Heat Dial */}
            <div className={cn(styles.controlGroup, disabled && styles.disabled)}>
                <div className={styles.controlLabel}>
                    <span className={styles.labelEmoji}>🔥</span>
                    <span>Heat</span>
                </div>
                <button
                    className={styles.heatDial}
                    onClick={handleHeatTap}
                    disabled={disabled}
                    aria-label={`Heat level ${heat}, tap to change`}
                >
                    <div className={styles.heatRing}>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <div
                                key={level}
                                className={cn(
                                    styles.heatNotch,
                                    level <= heat && styles.active
                                )}
                                style={{
                                    transform: `rotate(${(level - 1) * 45 - 90}deg) translateX(30px)`,
                                }}
                            />
                        ))}
                    </div>
                    <div className={styles.heatCenter}>
                        <div className={styles.heatFlames}>
                            {Array.from({ length: heat }, (_, i) => (
                                <span
                                    key={i}
                                    className={styles.flame}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    🔥
                                </span>
                            ))}
                        </div>
                    </div>
                </button>
                <div className={styles.heatLevel}>
                    Level {heat}
                </div>
            </div>
        </div>
    );
}

export default AlchemyControls;
