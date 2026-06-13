#!/usr/bin/env python3
"""Apply corrected oblast paths and labels to alerts.html."""
import re

# Generated paths
PATHS_BLOCK = '''                    <path class="map-oblast" data-oblast="volyn" d="M 91.9,31.1 L 135.1,15.5 L 205.4,23.3 L 264.9,46.6 L 275.7,100.9 L 270.3,132.0 L 243.2,155.3 L 162.2,155.3 L 108.1,139.8 L 91.9,100.9 Z"/>
                    <path class="map-oblast" data-oblast="rivne" d="M 162.2,77.6 L 227.0,46.6 L 297.3,54.4 L 335.1,100.9 L 351.4,147.5 L 335.1,186.4 L 297.3,201.9 L 227.0,194.1 L 162.2,155.3 Z"/>
                    <path class="map-oblast" data-oblast="lviv" d="M 27.0,155.3 L 91.9,116.5 L 162.2,132.0 L 189.2,194.1 L 178.4,264.0 L 124.3,295.1 L 54.1,279.5 L 27.0,232.9 Z"/>
                    <path class="map-oblast" data-oblast="ternopil" d="M 162.2,170.8 L 232.4,155.3 L 286.5,186.4 L 297.3,240.7 L 270.3,271.8 L 205.4,295.1 L 162.2,271.8 L 151.4,225.2 Z"/>
                    <path class="map-oblast" data-oblast="ivano-frankivsk" d="M 81.1,248.5 L 135.1,240.7 L 189.2,264.0 L 205.4,326.1 L 167.6,372.7 L 97.3,364.9 L 81.1,310.6 Z"/>
                    <path class="map-oblast" data-oblast="zakarpattia" d="M 5.4,279.5 L 81.1,248.5 L 151.4,279.5 L 167.6,326.1 L 145.9,364.9 L 75.7,372.7 L 5.4,333.9 Z"/>
                    <path class="map-oblast" data-oblast="chernivtsi" d="M 162.2,295.1 L 243.2,279.5 L 259.5,326.1 L 254.1,372.7 L 200.0,396.0 L 135.1,372.7 L 124.3,326.1 Z"/>
                    <path class="map-oblast" data-oblast="khmelnytskyi" d="M 162.2,155.3 L 232.4,139.8 L 324.3,155.3 L 351.4,209.6 L 345.9,279.5 L 297.3,326.1 L 243.2,310.6 L 189.2,279.5 L 162.2,225.2 Z"/>
                    <path class="map-oblast" data-oblast="zhytomyr" d="M 297.3,93.2 L 335.1,77.6 L 421.6,93.2 L 459.5,139.8 L 443.2,209.6 L 362.2,232.9 L 297.3,194.1 L 275.7,132.0 Z"/>
                    <path class="map-oblast" data-oblast="vinnytsia" d="M 243.2,170.8 L 324.3,139.8 L 432.4,170.8 L 459.5,232.9 L 443.2,310.6 L 362.2,333.9 L 270.3,318.4 L 227.0,271.8 Z"/>
                    <path class="map-oblast" data-oblast="kyiv" d="M 378.4,77.6 L 443.2,54.4 L 540.5,77.6 L 567.6,155.3 L 567.6,240.7 L 486.5,256.2 L 405.4,248.5 L 362.2,194.1 L 378.4,116.5 Z"/>
                    <path class="map-oblast" data-oblast="chernihiv" d="M 405.4,7.8 L 513.5,0.0 L 621.6,15.5 L 664.9,62.1 L 675.7,116.5 L 621.6,163.1 L 540.5,170.8 L 459.5,170.8 L 405.4,132.0 Z"/>
                    <path class="map-oblast" data-oblast="sumy" d="M 567.6,7.8 L 648.6,0.0 L 773.0,62.1 L 783.8,170.8 L 729.7,201.9 L 621.6,209.6 L 567.6,155.3 Z"/>
                    <path class="map-oblast" data-oblast="poltava" d="M 540.5,155.3 L 621.6,155.3 L 729.7,194.1 L 729.7,271.8 L 675.7,310.6 L 567.6,318.4 L 540.5,248.5 Z"/>
                    <path class="map-oblast" data-oblast="kharkiv" d="M 675.7,155.3 L 756.8,155.3 L 864.9,186.4 L 875.7,256.2 L 821.6,310.6 L 702.7,310.6 L 675.7,232.9 Z"/>
                    <path class="map-oblast" data-oblast="cherkasy" d="M 405.4,170.8 L 486.5,155.3 L 594.6,170.8 L 621.6,232.9 L 594.6,287.3 L 513.5,295.1 L 405.4,271.8 Z"/>
                    <path class="map-oblast" data-oblast="kirovograd" d="M 459.5,232.9 L 540.5,232.9 L 621.6,256.2 L 675.7,310.6 L 648.6,372.7 L 567.6,388.2 L 475.7,364.9 L 459.5,295.1 Z"/>
                    <path class="map-oblast" data-oblast="dnipro" d="M 594.6,256.2 L 702.7,248.5 L 783.8,279.5 L 783.8,364.9 L 729.7,411.5 L 621.6,411.5 L 567.6,364.9 L 567.6,287.3 Z"/>
                    <path class="map-oblast" data-oblast="zaporizhzhia" d="M 648.6,310.6 L 756.8,310.6 L 837.8,357.2 L 854.1,427.1 L 810.8,481.4 L 702.7,504.7 L 594.6,481.4 L 594.6,388.2 Z"/>
                    <path class="map-oblast" data-oblast="donetsk" d="M 783.8,271.8 L 891.9,264.0 L 989.2,326.1 L 1000.0,388.2 L 945.9,427.1 L 854.1,442.6 L 783.8,388.2 Z"/>
                    <path class="map-oblast" data-oblast="luhansk" d="M 827.0,186.4 L 918.9,178.6 L 1000.0,209.6 L 1000.0,310.6 L 945.9,364.9 L 864.9,364.9 L 827.0,310.6 Z"/>
                    <path class="map-oblast" data-oblast="mykolaiv" d="M 421.6,310.6 L 513.5,310.6 L 621.6,349.4 L 648.6,403.8 L 594.6,465.9 L 486.5,481.4 L 421.6,442.6 Z"/>
                    <path class="map-oblast" data-oblast="kherson" d="M 513.5,364.9 L 621.6,364.9 L 713.5,388.2 L 740.5,450.4 L 729.7,520.2 L 648.6,559.1 L 540.5,559.1 L 486.5,512.5 L 486.5,427.1 Z"/>
                    <path class="map-oblast" data-oblast="odesa" d="M 243.2,310.6 L 351.4,310.6 L 459.5,310.6 L 540.5,341.6 L 567.6,427.1 L 567.6,473.6 L 513.5,543.5 L 378.4,566.8 L 297.3,543.5 L 232.4,489.2 L 232.4,388.2 Z"/>
                    <path class="map-oblast crimea" data-oblast="crimea" d="M 567.6,496.9 L 637.8,481.4 L 729.7,504.7 L 794.6,543.5 L 800.0,582.4 L 740.5,628.9 L 659.5,644.5 L 594.6,628.9 L 567.6,582.4 L 578.4,520.2 Z"/>'''

LABELS_BLOCK = '''                    <!-- Western -->
                    <text x="180" y="135">Волинь</text>
                    <text x="230" y="146">Рівне</text>
                    <text x="110" y="200">Львів</text>
                    <text x="200" y="229">Тернопіль</text>
                    <text x="122" y="291">Ів.-Фр.</text>
                    <text x="43"  y="325">Закарп.</text>
                    <text x="188" y="340">Чернівці</text>
                    <!-- Central-west -->
                    <text x="252" y="239">Хмельн.</text>
                    <text x="360" y="175">Житомир</text>
                    <text x="330" y="254">Вінниця</text>
                    <!-- Central -->
                    <text x="470" y="155">Київськ.</text>
                    <text x="503" y="85">Чернігів</text>
                    <text x="540" y="242">Черкаси</text>
                    <text x="545" y="318">Кіровогр.</text>
                    <!-- North-east -->
                    <text x="680" y="128">Суми</text>
                    <text x="632" y="242">Полтава</text>
                    <text x="738" y="204">Харків</text>
                    <!-- East -->
                    <text x="886" y="313">Луганськ</text>
                    <text x="840" y="360">Донецьк</text>
                    <!-- South-east -->
                    <text x="668" y="322">Дніпро</text>
                    <text x="684" y="420">Запоріж.</text>
                    <!-- South -->
                    <text x="398" y="450">Одеса</text>
                    <text x="504" y="435">Миколаїв</text>
                    <text x="554" y="460">Херсон</text>
                    <text x="640" y="590">Крим</text>'''

with open("alerts.html", "r") as f:
    html = f.read()

# Replace oblast paths block
old_paths = re.search(
    r'(<!-- ── Oblast polygons[^<]*-->\s*<g class="map-oblasts"[^>]*>)(.*?)(</g>)',
    html, re.DOTALL
)
if old_paths:
    html = html[:old_paths.start(2)] + "\n" + PATHS_BLOCK + "\n                " + html[old_paths.end(2):]
    print("✓ Replaced oblast paths")
else:
    print("✗ Could not find oblast paths block")

# Replace labels block (everything inside map-oblast-labels g, between first and last comment/text)
old_labels = re.search(
    r'(<g class="map-oblast-labels"[^>]*>)(.*?)(</g>\s*\n\s*<!-- Kyiv capital)',
    html, re.DOTALL
)
if old_labels:
    html = html[:old_labels.start(2)] + "\n" + LABELS_BLOCK + "\n                " + html[old_labels.end(2):]
    print("✓ Replaced labels")
else:
    print("✗ Could not find labels block")

with open("alerts.html", "w") as f:
    f.write(html)

print("Done.")
