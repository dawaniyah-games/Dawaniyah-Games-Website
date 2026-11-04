import imgUiFramework from '../../../../assets/Uiframework_promo.jpg';
import imgUiFrameworkSrcSet from '../../../../assets/Uiframework_promo.jpg?w=320;480;640;768&format=webp&as=srcset';
import imgDendon from '../../../../assets/project-dendon-games.jpg';
import imgDendonSrcSet from '../../../../assets/project-dendon-games.jpg?w=320;480;640;768&format=webp&as=srcset';
import imgKhuzama from '../../../../assets/project-khuzama-games.jpg';
import imgKhuzamaSrcSet from '../../../../assets/project-khuzama-games.jpg?w=320;480;640;768&format=webp&as=srcset';
import imgCardBack from '../../../../assets/brand/card-back.webp';

export type ProjectCardId = 'ui' | 'dendon' | 'khuzama';

export const CARD_BACK = imgCardBack;

/** In the order the slots appear on the page, which is the order the card visits them. */
export const PROJECT_CARDS: { id: ProjectCardId; image: string; srcSet: string }[] = [
  { id: 'ui', image: imgUiFramework, srcSet: imgUiFrameworkSrcSet },
  { id: 'dendon', image: imgDendon, srcSet: imgDendonSrcSet },
  { id: 'khuzama', image: imgKhuzama, srcSet: imgKhuzamaSrcSet },
];

export const cardById = (id: ProjectCardId) => PROJECT_CARDS.find((card) => card.id === id)!;
