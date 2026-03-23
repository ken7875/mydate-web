import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library, config, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faComments, faCompass, faUser } from '@fortawesome/free-regular-svg-icons';

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
  faHeartCrack,
  faChevronUp,
  faChevronDown,
  faTv,
  faCheck,
  faRotateRight
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
  faHeartCrack,
  faChevronUp,
  faChevronDown,
  faTv,
  faCheck,
  faRotateRight,
  faUser as IconDefinition,
  faCompass as IconDefinition,
  faComments as IconDefinition
);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon);
});
