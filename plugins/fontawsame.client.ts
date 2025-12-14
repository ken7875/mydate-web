import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library, config } from '@fortawesome/fontawesome-svg-core';
import {
  faAngleDown,
  faBars,
  faMagnifyingGlass,
  // faCircleChevronLeft,
  // faCircleChevronRight,
  faAngleLeft,
  // faAngleRight,
  // faAngleUp,
  // faWifi,
  // faUtensils,
  // faMountain,
  // faSmoking,
  // faHotTub,
  // faMartiniGlass,
  // faDumbbell,
  // faCarSide,
  // faSquareParking,
  // faPersonSwimming,
  // faCircleXmark
  // faUserLarge,
  // faLocationDot,
  faVideo,
  faXmark,
  faHeart,
  faHeartCrack
} from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false;

library.add(
  faAngleDown,
  faBars,
  faMagnifyingGlass,
  // faCircleChevronLeft,
  // faCircleChevronRight,
  faAngleLeft,
  // faAngleRight,
  // faAngleUp,
  // faWifi,
  // faUtensils,
  // faPersonSwimming,
  // faMountain,
  // faSmoking,
  // faHotTub,
  // faMartiniGlass,
  // faDumbbell,
  // faCarSide,
  // faSquareParking,
  // faCircleXmark
  // faUserLarge,
  // faLocationDot,
  faVideo,
  faXmark,
  faHeart,
  faHeartCrack
);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon);
});
