# Description
Kalidokit(https://github.com/yeemachine/kalidokit)をReact上で動くようにしたサンプルです。

Kalidokitの`docs/`以下にあるサンプルは`@mediapipe/holistic`を使用していますが、
現在公開されているholisticの`results`には`Kalidokit.Pose.solve()`に必要な
`poseWorldLandmarks`が含まれていないため、かわりに`@mediapipe/pose`を使用しました。

こちらはissueが上がっていましたが直す予定は無いようです。https://github.com/google/mediapipe/issues/3155

また、Kalidokitのサンプルではthree-vrmの古いバージョンでの使用を前提としたコードがあったので、最新のthree-vrm(2.0.0)で動作するようにしています。

# Usage
1. `git clone {this repository}`
2. `npm install`
3. `npm start`