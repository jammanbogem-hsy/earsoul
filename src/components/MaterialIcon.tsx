import type { CSSProperties } from 'react'
import add from '@material-symbols/svg-400/rounded/add.svg'
import adjust from '@material-symbols/svg-400/rounded/adjust.svg'
import arrowForward from '@material-symbols/svg-400/rounded/arrow_forward.svg'
import arrowUpward from '@material-symbols/svg-400/rounded/arrow_upward.svg'
import batteryChargingFull from '@material-symbols/svg-400/rounded/battery_charging_full.svg'
import calculate from '@material-symbols/svg-400/rounded/calculate.svg'
import changeHistory from '@material-symbols/svg-400/rounded/change_history.svg'
import check from '@material-symbols/svg-400/rounded/check.svg'
import diamond from '@material-symbols/svg-400/rounded/diamond.svg'
import directionsRun from '@material-symbols/svg-400/rounded/directions_run.svg'
import filter4 from '@material-symbols/svg-400/rounded/filter_4.svg'
import home from '@material-symbols/svg-400/rounded/home.svg'
import keyboardArrowLeft from '@material-symbols/svg-400/rounded/keyboard_arrow_left.svg'
import keyboardArrowRight from '@material-symbols/svg-400/rounded/keyboard_arrow_right.svg'
import keyboardArrowUp from '@material-symbols/svg-400/rounded/keyboard_arrow_up.svg'
import localFlorist from '@material-symbols/svg-400/rounded/local_florist.svg'
import localDrink from '@material-symbols/svg-400/rounded/local_drink.svg'
import mapIcon from '@material-symbols/svg-400/rounded/map.svg'
import looksOne from '@material-symbols/svg-400/rounded/looks_one.svg'
import looksTwo from '@material-symbols/svg-400/rounded/looks_two.svg'
import looks3 from '@material-symbols/svg-400/rounded/looks_3.svg'
import looks4 from '@material-symbols/svg-400/rounded/looks_4.svg'
import musicNote from '@material-symbols/svg-400/rounded/music_note.svg'
import mouse from '@material-symbols/svg-400/rounded/mouse.svg'
import pause from '@material-symbols/svg-400/rounded/pause.svg'
import pauseCircle from '@material-symbols/svg-400/rounded/pause_circle.svg'
import playArrow from '@material-symbols/svg-400/rounded/play_arrow.svg'
import privacyTip from '@material-symbols/svg-400/rounded/privacy_tip.svg'
import progressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg'
import radar from '@material-symbols/svg-400/rounded/radar.svg'
import replay from '@material-symbols/svg-400/rounded/replay.svg'
import science from '@material-symbols/svg-400/rounded/science.svg'
import sentimentSatisfied from '@material-symbols/svg-400/rounded/sentiment_satisfied.svg'
import star from '@material-symbols/svg-400/rounded/star-fill.svg'
import steps from '@material-symbols/svg-400/rounded/steps.svg'
import textFields from '@material-symbols/svg-400/rounded/text_fields.svg'
import timer from '@material-symbols/svg-400/rounded/timer.svg'
import trendingUp from '@material-symbols/svg-400/rounded/trending_up.svg'
import volumeOff from '@material-symbols/svg-400/rounded/volume_off.svg'
import volumeUp from '@material-symbols/svg-400/rounded/volume_up.svg'
import wandStars from '@material-symbols/svg-400/rounded/wand_stars.svg'
import zoomIn from '@material-symbols/svg-400/rounded/zoom_in.svg'

const iconSources = {
  add,
  adjust,
  arrow_forward: arrowForward,
  arrow_upward: arrowUpward,
  battery_charging_full: batteryChargingFull,
  calculate,
  change_history: changeHistory,
  check,
  diamond,
  directions_run: directionsRun,
  filter_4: filter4,
  home,
  keyboard_arrow_left: keyboardArrowLeft,
  keyboard_arrow_right: keyboardArrowRight,
  keyboard_arrow_up: keyboardArrowUp,
  local_florist: localFlorist,
  local_drink: localDrink,
  map: mapIcon,
  looks_one: looksOne,
  looks_two: looksTwo,
  looks_3: looks3,
  looks_4: looks4,
  music_note: musicNote,
  mouse,
  pause,
  pause_circle: pauseCircle,
  play_arrow: playArrow,
  privacy_tip: privacyTip,
  progress_activity: progressActivity,
  radar,
  replay,
  science,
  sentiment_satisfied: sentimentSatisfied,
  star,
  steps,
  text_fields: textFields,
  timer,
  trending_up: trendingUp,
  volume_off: volumeOff,
  volume_up: volumeUp,
  wand_stars: wandStars,
  zoom_in: zoomIn,
} as const

export type MaterialIconName = keyof typeof iconSources

interface MaterialIconProps {
  name: MaterialIconName
  className?: string
  slot?: string
}

export function MaterialIcon({
  name,
  className = '',
  slot,
}: MaterialIconProps) {
  return (
    <span
      className={`material-symbol ${className}`.trim()}
      slot={slot}
      style={
        {
          '--material-icon-url': `url("${iconSources[name]}")`,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  )
}
